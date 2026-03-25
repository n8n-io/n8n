var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var timing_exports = {};
__export(timing_exports, {
  endTime: () => endTime,
  setMetric: () => setMetric,
  startTime: () => startTime,
  timing: () => timing,
  wrapTime: () => wrapTime
});
module.exports = __toCommonJS(timing_exports);
var import_context = require("../../context");
const getTime = () => {
  try {
    return performance.now();
  } catch {
  }
  return Date.now();
};
const timing = (config) => {
  const options = {
    total: true,
    enabled: true,
    totalDescription: "Total Response Time",
    autoEnd: true,
    crossOrigin: false,
    ...config
  };
  return async function timing2(c, next) {
    const headers = [];
    const timers = /* @__PURE__ */ new Map();
    if (c.get("metric")) {
      return await next();
    }
    c.set("metric", { headers, timers });
    if (options.total) {
      startTime(c, "total", options.totalDescription);
    }
    await next();
    if (options.total) {
      endTime(c, "total");
    }
    if (options.autoEnd) {
      timers.forEach((_, key) => endTime(c, key));
    }
    const enabled = typeof options.enabled === "function" ? options.enabled(c) : options.enabled;
    if (enabled) {
      c.res.headers.append("Server-Timing", headers.join(","));
      const crossOrigin = typeof options.crossOrigin === "function" ? options.crossOrigin(c) : options.crossOrigin;
      if (crossOrigin) {
        c.res.headers.append(
          "Timing-Allow-Origin",
          typeof crossOrigin === "string" ? crossOrigin : "*"
        );
      }
    }
  };
};
const setMetric = (c, name, valueDescription, description, precision) => {
  const metrics = c.get("metric");
  if (!metrics) {
    console.warn("Metrics not initialized! Please add the `timing()` middleware to this route!");
    return;
  }
  if (typeof valueDescription === "number") {
    const dur = valueDescription.toFixed(precision || 1);
    const metric = description ? `${name};dur=${dur};desc="${description}"` : `${name};dur=${dur}`;
    metrics.headers.push(metric);
  } else {
    const metric = valueDescription ? `${name};desc="${valueDescription}"` : `${name}`;
    metrics.headers.push(metric);
  }
};
const startTime = (c, name, description) => {
  const metrics = c.get("metric");
  if (!metrics) {
    console.warn("Metrics not initialized! Please add the `timing()` middleware to this route!");
    return;
  }
  metrics.timers.set(name, { description, start: getTime() });
};
const endTime = (c, name, precision) => {
  const metrics = c.get("metric");
  if (!metrics) {
    console.warn("Metrics not initialized! Please add the `timing()` middleware to this route!");
    return;
  }
  const timer = metrics.timers.get(name);
  if (!timer) {
    console.warn(`Timer "${name}" does not exist!`);
    return;
  }
  const { description, start } = timer;
  const duration = getTime() - start;
  setMetric(c, name, duration, description, precision);
  metrics.timers.delete(name);
};
async function wrapTime(c, name, callable, description, precision) {
  startTime(c, name, description);
  try {
    return await callable;
  } finally {
    endTime(c, name, precision);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  endTime,
  setMetric,
  startTime,
  timing,
  wrapTime
});
