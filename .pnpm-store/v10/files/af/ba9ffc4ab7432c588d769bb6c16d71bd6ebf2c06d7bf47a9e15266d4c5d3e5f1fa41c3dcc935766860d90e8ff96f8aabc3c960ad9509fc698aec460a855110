"use client";

// ../core/dist/index.js
var style_module_default = '@keyframes Bc2PgW_ya{to{translate:0 var(--sh)}}@keyframes Bc2PgW_xa{to{translate:var(--xlp)0}}@keyframes Bc2PgW_r{50%{rotate:var(--hr)180deg}to{rotate:var(--r)360deg}}.Bc2PgW_c{z-index:1200;width:0;height:0;position:relative;overflow:visible}.Bc2PgW_p{animation:xa var(--dc)forwards cubic-bezier(var(--x1),var(--x2),var(--x3),var(--x4));animation-name:Bc2PgW_xa}.Bc2PgW_p>div{animation:ya var(--dc)forwards cubic-bezier(var(--y1),var(--y2),var(--y3),var(--y4));width:var(--w);height:var(--h);animation-name:Bc2PgW_ya;position:absolute;top:0;left:0}.Bc2PgW_p>div:before{content:"";background-color:var(--bgc);animation:r var(--rd)infinite linear;border-radius:var(--br);width:100%;height:100%;animation-name:Bc2PgW_r;display:block}';
var p = "Bc2PgW_p";
var c = "Bc2PgW_c";
var DEFAULT_COLORS = ["#FFC700", "#FF0000", "#2E3191", "#41BBC7"];
var DEFAULT_DURATION = 3500;
var DEFAULT_FORCE = 0.5;
var DEFAULT_PARTICLE_COUNT = 150;
var DEFAULT_PARTICLE_SHAPE = "mix";
var DEFAULT_PARTICLE_SIZE = 12;
var DEFAULT_PARTICLE_CLASS = "";
var DEFAULT_DESTROY_AFTER_DONE = true;
var DEFAULT_STAGE_HEIGHT = 800;
var DEFAULT_STAGE_WIDTH = 1600;
function confetti(container, options = {}) {
  let {
    colors = DEFAULT_COLORS,
    duration = DEFAULT_DURATION,
    force = DEFAULT_FORCE,
    particleCount = DEFAULT_PARTICLE_COUNT,
    particleShape = DEFAULT_PARTICLE_SHAPE,
    particleSize = DEFAULT_PARTICLE_SIZE,
    particleClass = DEFAULT_PARTICLE_CLASS,
    destroyAfterDone = DEFAULT_DESTROY_AFTER_DONE,
    stageHeight = DEFAULT_STAGE_HEIGHT,
    stageWidth = DEFAULT_STAGE_WIDTH
  } = options;
  append_styles(style_module_default);
  container.classList.add(c);
  container.style.setProperty("--sh", stageHeight + "px");
  let particles = [];
  let nodes = [];
  const calc_rotation_transform = () => math_round(random() * (POSSIBLE_ROTATION_TRANSFORMS - 1));
  const get_is_circle = (particle_shape, rotation_transform) => particleShape !== "rectangles" && (particle_shape === "circles" || should_be_circle(rotation_transform));
  function confetti_styles(node, degree) {
    const rotation_transform = calc_rotation_transform();
    const is_circle = get_is_circle(particleShape, rotation_transform);
    const set_css_var = (key, val) => node.style.setProperty(key, val + "");
    set_css_var(
      // x landing point
      "--xlp",
      map_range(abs(rotate(degree, 90) - 180), 0, 180, -stageWidth / 2, stageWidth / 2) + "px"
    );
    set_css_var(
      // duration chaos
      "--dc",
      duration - math_round(random() * 1e3) + "ms"
    );
    const x1 = random() < CRAZY_PARTICLES_FREQUENCY ? round(random() * CRAZY_PARTICLE_CRAZINESS, 2) : 0;
    set_css_var("--x1", x1);
    set_css_var("--x2", x1 * -1);
    set_css_var("--x3", x1);
    set_css_var("--x4", round(abs(map_range(abs(rotate(degree, 90) - 180), 0, 180, -1, 1)), 4));
    set_css_var("--y1", round(random() * BEZIER_MEDIAN, 4));
    set_css_var("--y2", round(random() * force * (coin_flip() ? 1 : -1), 4));
    set_css_var("--y3", BEZIER_MEDIAN);
    set_css_var("--y4", round(max(map_range(abs(degree - 180), 0, 180, force, -force), 0), 4));
    set_css_var(
      // --width
      "--w",
      (is_circle ? particleSize : math_round(random() * 4) + particleSize / 2) + "px"
    );
    set_css_var(
      // --height
      "--h",
      (is_circle ? particleSize : math_round(random() * 2) + particleSize) + "px"
    );
    const rotation = rotation_transform.toString(2).padStart(3, "0").split("");
    set_css_var(
      // --half-rotation
      "--hr",
      rotation.map((n) => +n / 2 + "").join(" ")
    );
    set_css_var(
      // --rotation
      "--r",
      rotation.join(" ")
    );
    set_css_var(
      // --rotation-duration
      "--rd",
      round(random() * (ROTATION_SPEED_MAX - ROTATION_SPEED_MIN) + ROTATION_SPEED_MIN) + "ms"
    );
    set_css_var(
      // --border-radius
      "--br",
      is_circle ? "50%" : 0
    );
  }
  let timer;
  function scratch() {
    container.innerHTML = "";
    clearTimeout(timer);
    particles = create_particles(particleCount, colors);
    nodes = create_particle_nodes(container, particles, particleClass);
    for (const [i, node] of object_entries(nodes))
      confetti_styles(node, particles[+i].degree);
    timer = setTimeout(() => {
      if (destroyAfterDone)
        container.innerHTML = "";
    }, duration);
  }
  scratch();
  return {
    update(new_options) {
      const new_particle_count = new_options.particleCount ?? DEFAULT_PARTICLE_COUNT;
      const new_particle_shape = new_options.particleShape ?? DEFAULT_PARTICLE_SHAPE;
      const new_particle_size = new_options.particleSize ?? DEFAULT_PARTICLE_SIZE;
      const new_particle_class = new_options.particleClass ?? DEFAULT_PARTICLE_CLASS;
      const new_colors = new_options.colors ?? DEFAULT_COLORS;
      const new_stage_height = new_options.stageHeight ?? DEFAULT_STAGE_HEIGHT;
      const new_duration = new_options.duration ?? DEFAULT_DURATION;
      const new_force = new_options.force ?? DEFAULT_FORCE;
      const new_stage_width = new_options.stageWidth ?? DEFAULT_STAGE_WIDTH;
      const new_destroy_after_done = new_options.destroyAfterDone ?? DEFAULT_DESTROY_AFTER_DONE;
      particles = create_particles(new_particle_count, new_colors);
      let start_from_scratch = false;
      if (new_particle_count === particleCount) {
        nodes = Array.from(container.querySelectorAll(`.${p}`));
        for (const [i, { color }] of object_entries(particles)) {
          const node = nodes[+i];
          if (JSON.stringify(colors) !== JSON.stringify(new_colors)) {
            node.style.setProperty("--bgc", color);
          }
          if (new_particle_shape !== particleShape) {
            node.style.setProperty(
              // --border-radius
              "--br",
              get_is_circle(new_particle_shape, calc_rotation_transform()) ? "50%" : "0"
            );
          }
          if (new_particle_class !== particleClass) {
            if (particleClass)
              node.classList.remove(particleClass);
            if (new_particle_class)
              node.classList.add(new_particle_class);
          }
        }
      } else {
        start_from_scratch = true;
      }
      if (destroyAfterDone && !new_destroy_after_done) {
        clearTimeout(timer);
      }
      container.style.setProperty("--sh", new_stage_height + "px");
      duration = new_duration;
      colors = new_colors;
      force = new_force;
      particleCount = new_particle_count;
      particleShape = new_particle_shape;
      particleSize = new_particle_size;
      particleClass = new_particle_class;
      destroyAfterDone = new_destroy_after_done;
      stageHeight = new_stage_height;
      stageWidth = new_stage_width;
      if (start_from_scratch)
        scratch();
    },
    destroy() {
      container.innerHTML = "";
      clearTimeout(timer);
    }
  };
}
function append_styles(styles) {
  if (document.querySelector(`style[data-neoconfetti]`))
    return;
  const style = element("style");
  style.dataset.neoconfetti = "";
  style.textContent = styles;
  append_child(document.head, style);
}
function create_particle_nodes(container, particles = [], particleClass) {
  const particle_nodes = [];
  for (const { color } of particles) {
    const particle_node = element("div");
    particle_node.className = `${p} ${particleClass}`;
    particle_node.style.setProperty("--bgc", color);
    const inner_particle = element("div");
    append_child(particle_node, inner_particle);
    append_child(container, particle_node);
    particle_nodes.push(particle_node);
  }
  return particle_nodes;
}
var ROTATION_SPEED_MIN = 200;
var ROTATION_SPEED_MAX = 800;
var CRAZY_PARTICLES_FREQUENCY = 0.1;
var CRAZY_PARTICLE_CRAZINESS = 0.3;
var BEZIER_MEDIAN = 0.5;
var abs = Math.abs;
var random = Math.random;
var math_round = Math.round;
var max = Math.max;
var element = (name) => document.createElement(name);
var append_child = (parent, child) => parent.appendChild(child);
var create_particles = (count, colors) => Array.from({ length: count }, (_, i) => ({
  color: colors[i % colors.length],
  degree: i * 360 / count
}));
var round = (num, precision = 2) => math_round((num + Number.EPSILON) * 10 ** precision) / 10 ** precision;
var map_range = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;
var rotate = (degree, amount) => degree + amount > 360 ? degree + amount - 360 : degree + amount;
var coin_flip = () => random() > 0.5;
var object_entries = Object.entries;
var POSSIBLE_ROTATION_TRANSFORMS = 6;
var should_be_circle = (rotation_transform) => rotation_transform !== 1 && coin_flip();

// src/index.ts
import { createElement, useEffect, useRef } from "react";
function Confetti({ class: className, ...options }) {
  const target_ref = useRef(null);
  const instance_ref = useRef();
  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!target_ref.current)
      return;
    if (!instance_ref.current) {
      instance_ref.current = confetti(target_ref.current, options);
      return;
    }
    instance_ref.current.update(options);
    return instance_ref.current.destroy;
  }, [options]);
  return createElement("div", { ref: target_ref, className });
}
export {
  Confetti
};
