let settings = {
  particles: {
    length: 500,
    duration: 2,
    velocity: 100,
    effect: -0.75,
    size: 30
  },
  // Cấu hình cho cơn mưa trái tim ở nền
  rain: {
    count: 1000,         // số trái tim rơi cùng lúc
    minSize: 6,         // kích thước nhỏ nhất (px)
    maxSize: 34,        // kích thước lớn nhất (px)
    minSpeed: 25,       // tốc độ rơi chậm nhất (px/giây)
    maxSpeed: 90,       // tốc độ rơi nhanh nhất (px/giây)
    sway: 30,           // biên độ đung đưa trái phải (px)
    minOpacity: 0.15,
    maxOpacity: 0.85,
    colors: ["#ea80b0", "#ff6b9d", "#ff9ec7", "#ffd0e0", "#d94f86"]
  }
};

(function () {
  let b = 0;
  let c = ["ms", "moz", "webkit", "o"];
  for (let a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
    window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[c[a] + "CancelAnimationFrame"] ||
      window[c[a] + "CancelRequestAnimationFrame"];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (h) {
      let d = new Date().getTime();
      let f = Math.max(0, 16 - (d - b));
      let g = window.setTimeout(function () {
        h(d + f);
      }, f);
      b = d + f;
      return g;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (d) {
      clearTimeout(d);
    };
  }
})();

// Hàm dùng chung: một điểm trên đường cong trái tim
function heartPoint(t) {
  return {
    x: 160 * Math.pow(Math.sin(t), 3),
    y:
      130 * Math.cos(t) -
      50 * Math.cos(2 * t) -
      20 * Math.cos(3 * t) -
      10 * Math.cos(4 * t) +
      25
  };
}

let Point = (function () {
  function Point(x, y) {
    this.x = typeof x !== "undefined" ? x : 0;
    this.y = typeof y !== "undefined" ? y : 0;
  }
  Point.prototype.clone = function () {
    return new Point(this.x, this.y);
  };
  Point.prototype.length = function (length) {
    if (typeof length == "undefined")
      return Math.sqrt(this.x * this.x + this.y * this.y);
    this.normalize();
    this.x *= length;
    this.y *= length;
    return this;
  };
  Point.prototype.normalize = function () {
    var length = this.length();
    this.x /= length;
    this.y /= length;
    return this;
  };
  return Point;
})();

let Particle = (function () {
  function Particle() {
    this.position = new Point();
    this.velocity = new Point();
    this.acceleration = new Point();
    this.age = 0;
  }
  Particle.prototype.initialize = function (x, y, dx, dy) {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = dx;
    this.velocity.y = dy;
    this.acceleration.x = dx * settings.particles.effect;
    this.acceleration.y = dy * settings.particles.effect;
    this.age = 0;
  };
  Particle.prototype.update = function (deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.age += deltaTime;
  };
  Particle.prototype.draw = function (context, image) {
    function ease(t) {
      return --t * t * t + 1;
    }
    let size = image.width * ease(this.age / settings.particles.duration);
    context.globalAlpha = 1 - this.age / settings.particles.duration;
    context.drawImage(
      image,
      this.position.x - size / 2,
      this.position.y - size / 2,
      size,
      size
    );
  };
  return Particle;
})();

let ParticlePool = (function () {
  let particles,
    firstActive = 0,
    firstFree = 0,
    duration = settings.particles.duration;

  function ParticlePool(length) {
    particles = new Array(length);
    for (let i = 0; i < particles.length; i++) particles[i] = new Particle();
  }
  ParticlePool.prototype.add = function (x, y, dx, dy) {
    particles[firstFree].initialize(x, y, dx, dy);
    firstFree++;
    if (firstFree == particles.length) firstFree = 0;
    if (firstActive == firstFree) firstActive++;
    if (firstActive == particles.length) firstActive = 0;
  };
  ParticlePool.prototype.update = function (deltaTime) {
    let i;
    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++) particles[i].update(deltaTime);
    }
    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++)
        particles[i].update(deltaTime);
      for (i = 0; i < firstFree; i++) particles[i].update(deltaTime);
    }
    while (particles[firstActive].age >= duration && firstActive != firstFree) {
      firstActive++;
      if (firstActive == particles.length) firstActive = 0;
    }
  };
  ParticlePool.prototype.draw = function (context, image) {
    let i;
    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++)
        particles[i].draw(context, image);
    }
    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++)
        particles[i].draw(context, image);
      for (i = 0; i < firstFree; i++) particles[i].draw(context, image);
    }
  };
  return ParticlePool;
})();

/* ==========================================================
   MƯA TRÁI TIM (lớp nền)
   ========================================================== */
(function (canvas) {
  if (!canvas) return;

  let context = canvas.getContext("2d");
  let cfg = settings.rain;
  let hearts = [];
  let time;

  // Vẽ sẵn mỗi màu thành 1 sprite để chạy nhẹ máy
  function makeSprite(color, size) {
    let c = document.createElement("canvas");
    c.width = c.height = size;
    let ctx = c.getContext("2d");

    function to(t) {
      let p = heartPoint(t);
      return {
        x: size / 2 + (p.x * size) / 350,
        y: size / 2 - (p.y * size) / 350
      };
    }

    ctx.beginPath();
    let t = -Math.PI;
    let p = to(t);
    ctx.moveTo(p.x, p.y);
    while (t < Math.PI) {
      t += 0.01;
      p = to(t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size / 6;
    ctx.fill();
    return c;
  }

  let sprites = cfg.colors.map(function (color) {
    return makeSprite(color, 64);
  });

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetHeart(heart, startAbove) {
    heart.size = rand(cfg.minSize, cfg.maxSize);
    heart.x = Math.random() * canvas.width;
    heart.y = startAbove
      ? -heart.size - Math.random() * canvas.height
      : Math.random() * canvas.height;
    heart.speed = rand(cfg.minSpeed, cfg.maxSpeed) * (heart.size / cfg.maxSize + 0.4);
    heart.sprite = sprites[(Math.random() * sprites.length) | 0];
    heart.opacity = rand(cfg.minOpacity, cfg.maxOpacity);
    heart.swayAmp = rand(cfg.sway * 0.3, cfg.sway);
    heart.swaySpeed = rand(0.5, 1.6);
    heart.phase = Math.random() * Math.PI * 2;
    heart.angle = rand(-0.4, 0.4);
    heart.spin = rand(-0.6, 0.6);
    return heart;
  }

  function build() {
    let scale = (canvas.width * canvas.height) / (1440 * 900);
    let total = Math.round(cfg.count * Math.max(0.5, Math.min(1.6, scale)));
    hearts = [];
    for (let i = 0; i < total; i++) hearts.push(resetHeart({}, false));
  }

  function render() {
    requestAnimationFrame(render);

    let newTime = new Date().getTime() / 1000;
    let deltaTime = newTime - (time || newTime);
    time = newTime;
    if (deltaTime > 0.1) deltaTime = 0.1;

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < hearts.length; i++) {
      let h = hearts[i];
      h.y += h.speed * deltaTime;
      h.phase += h.swaySpeed * deltaTime;
      h.angle += h.spin * deltaTime;

      if (h.y - h.size > canvas.height) resetHeart(h, true);

      let x = h.x + Math.sin(h.phase) * h.swayAmp;

      if (h.size < 12) {
        context.globalAlpha = h.opacity;
        context.drawImage(h.sprite, x - h.size / 2, h.y - h.size / 2, h.size, h.size);
        continue;
      }

      context.save();
      context.globalAlpha = h.opacity;
      context.translate(x, h.y);
      context.rotate(Math.sin(h.phase) * 0.25 + h.angle * 0.2);
      context.drawImage(h.sprite, -h.size / 2, -h.size / 2, h.size, h.size);
      context.restore();
    }
  }

  function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    build();
  }
  window.addEventListener("resize", onResize);

  setTimeout(onResize, 10);

  window.startHeartRain = function () {
    if (window.startHeartRain.__started) return;
    window.startHeartRain.__started = true;
    onResize();
    render();
  };
})(document.getElementById("heartrain"));

/* ==========================================================
   TRÁI TIM CHÍNH (giữ nguyên như bản gốc)
   ========================================================== */
(function (canvas) {
  let context = canvas.getContext("2d"),
    particles = new ParticlePool(settings.particles.length),
    particleRate = settings.particles.length / settings.particles.duration,
    time;

  function pointOnHeart(t) {
    let p = heartPoint(t);
    return new Point(p.x, p.y);
  }

  let image = (function () {
    let canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    canvas.width = settings.particles.size;
    canvas.height = settings.particles.size;

    function to(t) {
      let point = pointOnHeart(t);
      point.x =
        settings.particles.size / 2 + (point.x * settings.particles.size) / 350;
      point.y =
        settings.particles.size / 2 - (point.y * settings.particles.size) / 350;
      return point;
    }

    context.beginPath();
    let t = -Math.PI;
    let point = to(t);
    context.moveTo(point.x, point.y);
    while (t < Math.PI) {
      t += 0.01;
      point = to(t);
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.fillStyle = "#ea80b0";
    context.fill();

    let image = new Image();
    image.src = canvas.toDataURL();
    return image;
  })();

  function render() {
    requestAnimationFrame(render);
    let newTime = new Date().getTime() / 1000,
      deltaTime = newTime - (time || newTime);
    time = newTime;

    context.clearRect(0, 0, canvas.width, canvas.height);

    let amount = particleRate * deltaTime;
    for (let i = 0; i < amount; i++) {
      let pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      let dir = pos.clone().length(settings.particles.velocity);
      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 - pos.y,
        dir.x,
        -dir.y
      );
    }

    particles.update(deltaTime);
    particles.draw(context, image);
  }

  function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.addEventListener("resize", onResize);

  setTimeout(onResize, 10);

  window.startPinkboard = function () {
    if (window.startPinkboard.__started) return;
    window.startPinkboard.__started = true;
    onResize();
    render();
  };
})(document.getElementById("pinkboard"));

/* ==========================================================
   ICON TRÁI TIM Ở GIỮA — bấm vào để "nở" ra mượt mà
   ========================================================== */
(function () {
  let icon = document.getElementById("heart-icon");
  if (!icon) return;

  let started = false;

  function trigger() {
    if (started) return;
    started = true;

    icon.classList.add("grow");
    icon.style.pointerEvents = "none";
    icon.setAttribute("aria-hidden", "true");

    // Khởi chạy hiệu ứng mưa & particle khi icon nở đến đỉnh điểm (400ms)
    setTimeout(function () {
      window.startHeartRain && window.startHeartRain();
      window.startPinkboard && window.startPinkboard();
    }, 750);

    // Gỡ hẳn icon sau khi hiệu ứng kết thúc hoàn toàn (850ms)
    setTimeout(function () {
      icon.style.display = "none";
    }, 1550);
    // Khởi chạy hiệu ứng mưa & particle khi icon nở đến đỉnh điểm (750ms)
    setTimeout(function () {
      window.startHeartRain && window.startHeartRain();
      window.startPinkboard && window.startPinkboard();
      
      // Kích hoạt hiện dải chữ marquee neon mờ viền hòa quyện
      let textContainer = document.getElementById("text-container");
      if (textContainer) {
        textContainer.style.opacity = "1";
      }
    }, 750);
  }

  icon.addEventListener("click", trigger);
  icon.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      trigger();
    }
  });
})();