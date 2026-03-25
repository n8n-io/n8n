// src/utils/concurrent.ts
var DEFAULT_CONCURRENCY = 1024;
var createPool = ({
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
export {
  createPool
};
