'use strict';

const GET_IS_ASYNC = Symbol.for("quansync.getIsAsync");
class QuansyncError extends Error {
  constructor(message = "Unexpected promise in sync context") {
    super(message);
    this.name = "QuansyncError";
  }
}
function isThenable(value) {
  return value && typeof value === "object" && typeof value.then === "function";
}
function isQuansyncGenerator(value) {
  return value && typeof value === "object" && typeof value[Symbol.iterator] === "function" && "__quansync" in value;
}
function fromObject(options) {
  const generator = function* (...args) {
    const isAsync = yield GET_IS_ASYNC;
    if (isAsync)
      return yield options.async.apply(this, args);
    return options.sync.apply(this, args);
  };
  function fn(...args) {
    const iter = generator.apply(this, args);
    iter.then = (...thenArgs) => options.async.apply(this, args).then(...thenArgs);
    iter.__quansync = true;
    return iter;
  }
  fn.sync = options.sync;
  fn.async = options.async;
  return fn;
}
function fromPromise(promise) {
  return fromObject({
    async: () => Promise.resolve(promise),
    sync: () => {
      if (isThenable(promise))
        throw new QuansyncError();
      return promise;
    }
  });
}
function unwrapYield(value, isAsync) {
  if (value === GET_IS_ASYNC)
    return isAsync;
  if (isQuansyncGenerator(value))
    return isAsync ? iterateAsync(value) : iterateSync(value);
  if (!isAsync && isThenable(value))
    throw new QuansyncError();
  return value;
}
const DEFAULT_ON_YIELD = (value) => value;
function iterateSync(generator, onYield = DEFAULT_ON_YIELD) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(unwrapYield(onYield(current.value, false)));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return unwrapYield(current.value);
}
async function iterateAsync(generator, onYield = DEFAULT_ON_YIELD) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(await unwrapYield(onYield(current.value, true), true));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return current.value;
}
function fromGeneratorFn(generatorFn, options) {
  return fromObject({
    name: generatorFn.name,
    async(...args) {
      return iterateAsync(generatorFn.apply(this, args), options?.onYield);
    },
    sync(...args) {
      return iterateSync(generatorFn.apply(this, args), options?.onYield);
    }
  });
}
function quansync(input, options) {
  if (isThenable(input))
    return fromPromise(input);
  if (typeof input === "function")
    return fromGeneratorFn(input, options);
  else
    return fromObject(input);
}
function toGenerator(promise) {
  if (isQuansyncGenerator(promise))
    return promise;
  return fromPromise(promise)();
}
const getIsAsync = quansync({
  async: () => Promise.resolve(true),
  sync: () => false
});

exports.GET_IS_ASYNC = GET_IS_ASYNC;
exports.QuansyncError = QuansyncError;
exports.getIsAsync = getIsAsync;
exports.quansync = quansync;
exports.toGenerator = toGenerator;
