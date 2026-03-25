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
var concurrent_exports = {};
__export(concurrent_exports, {
  createPool: () => createPool
});
module.exports = __toCommonJS(concurrent_exports);
const DEFAULT_CONCURRENCY = 1024;
const createPool = ({
  concurrency,
  interval
} = {}) => {
  concurrency ||= DEFAULT_CONCURRENCY;
  if (concurrency === Infinity) {
    return {
      run: async (fn) => fn()
    };
  }
  const pool = /* @__PURE__ */ new Set();
  const run = async (fn, promise, resolve) => {
    if (pool.size >= concurrency) {
      promise ||= new Promise((r) => resolve = r);
      setTimeout(() => run(fn, promise, resolve));
      return promise;
    }
    const marker = {};
    pool.add(marker);
    const result = await fn();
    if (interval) {
      setTimeout(() => pool.delete(marker), interval);
    } else {
      pool.delete(marker);
    }
    if (resolve) {
      resolve(result);
      return promise;
    } else {
      return result;
    }
  };
  return { run };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPool
});
