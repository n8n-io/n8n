/* Portable native-scroll conductor for a persistent multi-chapter WebGL world.
   It has no Three.js dependency. Give it semantic section elements and render
   the returned exact/smoothed progress through your own camera/world systems.

   Usage:
     const conductor = createScrollConductor({
       sections: document.querySelectorAll('[data-cam]'),
       damping: 5.2,
       reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches,
       onUpdate(state) { updateWorld(state); },
       onChapterChange(index, state) { updateDOM(index, state); }
     });
     conductor.start();
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createScrollConductor: factory() };
  } else {
    root.createScrollConductor = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function createScrollConductor(options) {
    options = options || {};

    var sections = Array.from(options.sections || []);
    if (!sections.length) throw new Error("createScrollConductor requires sections");

    var damping = Number.isFinite(options.damping) ? options.damping : 5.2;
    var reduce = Boolean(options.reducedMotion);
    var onUpdate = typeof options.onUpdate === "function" ? options.onUpdate : function () {};
    var onChapterChange = typeof options.onChapterChange === "function"
      ? options.onChapterChange
      : function () {};
    var getY = typeof options.getScrollY === "function"
      ? options.getScrollY
      : function () { return window.scrollY || window.pageYOffset || 0; };

    var anchors = [];
    var exact = 0;
    var smooth = 0;
    var direction = 0;
    var previousY = 0;
    var active = -1;
    var running = false;
    var frame = 0;
    var lastTime = 0;
    var dirty = true;
    var widthAtMeasure = 0;
    var resizeObserver = null;

    function maxScroll() {
      return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    function measure() {
      var max = maxScroll();
      widthAtMeasure = window.innerWidth;
      anchors = sections.map(function (element, index) {
        if (index === 0) return 0;
        if (index === sections.length - 1) return max;
        var value = element.offsetTop + element.offsetHeight * 0.5 - window.innerHeight * 0.5;
        return clamp(value, 0, max);
      });

      for (var index = 1; index < anchors.length; index += 1) {
        anchors[index] = Math.max(anchors[index], anchors[index - 1] + 1);
      }

      dirty = true;
      return anchors.slice();
    }

    function progressAt(y) {
      if (!anchors.length) measure();
      y = clamp(y, 0, maxScroll());
      if (y <= anchors[0]) return 0;

      for (var index = 0; index < anchors.length - 1; index += 1) {
        if (y <= anchors[index + 1]) {
          var span = Math.max(1, anchors[index + 1] - anchors[index]);
          return index + clamp((y - anchors[index]) / span, 0, 1);
        }
      }
      return anchors.length - 1;
    }

    function segment(progress) {
      var last = sections.length - 1;
      var index = clamp(Math.floor(progress), 0, last);
      var next = Math.min(last, index + 1);
      return {
        index: index,
        next: next,
        local: next === index ? 0 : clamp(progress - index, 0, 1)
      };
    }

    function state() {
      var exactSegment = segment(exact);
      var smoothSegment = segment(smooth);
      return {
        exact: exact,
        smooth: smooth,
        index: exactSegment.index,
        next: exactSegment.next,
        localExact: exactSegment.local,
        smoothIndex: smoothSegment.index,
        smoothNext: smoothSegment.next,
        localSmooth: smoothSegment.local,
        direction: direction,
        anchors: anchors
      };
    }

    function readScroll() {
      var y = getY();
      var delta = y - previousY;
      if (Math.abs(delta) > 0.25) direction = delta > 0 ? 1 : -1;
      previousY = y;
      exact = progressAt(y);
      dirty = true;
    }

    function tick(now) {
      if (!running) return;
      var dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
      lastTime = now;

      var previousSmooth = smooth;
      smooth = reduce ? exact : damp(smooth, exact, damping, dt);
      if (Math.abs(smooth - exact) < 0.0001) smooth = exact;

      var nextState = state();
      if (nextState.index !== active) {
        active = nextState.index;
        onChapterChange(active, nextState);
      }

      if (dirty || smooth !== previousSmooth) {
        dirty = false;
        onUpdate(nextState);
      }

      frame = requestAnimationFrame(tick);
    }

    function onScroll() {
      readScroll();
    }

    function onResize() {
      var widthChanged = window.innerWidth !== widthAtMeasure;
      var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (coarse && !widthChanged) return;
      measure();
      readScroll();
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        return;
      }
      if (running && !frame) frame = requestAnimationFrame(tick);
      readScroll();
    }

    function start() {
      if (running) return api;
      running = true;
      measure();
      previousY = getY();
      exact = progressAt(previousY);
      smooth = reduce ? exact : exact;

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("orientationchange", onResize, { passive: true });
      window.addEventListener("pageshow", onResize);
      window.addEventListener("hashchange", onResize);
      document.addEventListener("visibilitychange", onVisibility);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(function () {
          measure();
          readScroll();
        });
        sections.forEach(function (section) { resizeObserver.observe(section); });
      }

      active = -1;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
      return api;
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pageshow", onResize);
      window.removeEventListener("hashchange", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = null;
    }

    function setReducedMotion(value) {
      reduce = Boolean(value);
      if (reduce) smooth = exact;
      dirty = true;
    }

    function goTo(index, behavior) {
      index = clamp(Math.round(index), 0, anchors.length - 1);
      window.scrollTo({
        top: anchors[index],
        behavior: reduce ? "auto" : (behavior || "smooth")
      });
    }

    var api = {
      start: start,
      stop: stop,
      destroy: stop,
      measure: measure,
      read: readScroll,
      getState: state,
      progressAt: progressAt,
      goTo: goTo,
      setReducedMotion: setReducedMotion
    };

    return api;
  }

  return createScrollConductor;
});
