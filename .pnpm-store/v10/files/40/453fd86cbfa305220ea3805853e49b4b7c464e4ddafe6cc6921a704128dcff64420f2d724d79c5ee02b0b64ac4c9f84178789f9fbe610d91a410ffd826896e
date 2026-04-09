import { Queue } from 'queue-lit';

/**
 * pLimit creates a "limiter" function that can be used to enqueue
 * promise returning functions with limited concurrency.
 * @param {number} concurrency
 */
function pLimit(concurrency) {
  if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
    throw new TypeError('Expected `concurrency` to be a number greater than 1');
  }
  const queue = new Queue();
  let activeCount = 0;

  /**
   * next updates the activeCount and executes the next queued item.
   */
  const next = () => {
    activeCount--;
    if (queue.size > 0) {
      queue.pop()();
    }
  };

  /**
   * run executes a given `fn` passing `args`. Inside the `run` closure any
   * thrown errors/rejections are swallowed, but by resolving the `fn` result
   * immediatly we surface any rejections/errors to a parent function.
   * @param {Function} fn
   * @param {Promise.resolve} resolve
   * @param {*} args
   */
  const run = async (fn, resolve, args) => {
    activeCount++;
    const result = (async () => fn(...args))();
    resolve(result);
    try {
      await result;
    } catch {}
    next();
  };

  /**
   * enqueue enqueues a given `fn` to be executed while limiting concurrency.
   * @param {Function} fn
   * @param {Promise.resolve} resolve
   * @param {*} args
   */
  const enqueue = (fn, resolve, args) => {
    queue.push(run.bind(null, fn, resolve, args));
    (async () => {
      // NOTE(joel): This function needs to wait until the next microtask
      // before comparing `activeCount` to `concurrency` because `activeCount`
      // is updated asynchronously when the run function is popped and
      // called.
      await Promise.resolve();
      if (activeCount < concurrency && queue.size > 0) {
        queue.pop()();
      }
    })();
  };

  /**
   * generator defines the public api of `pLimit` and allows enqueueing promise
   * returning functions while limiting their concurrency.
   * @param {(...args: Arguments) => PromiseLike<RType> | RType} fn
   * @param  {Arguments} args
   * @returns {Promise<RType>}
   * @template {unknown[]} Arguments
   * @template RType
   */
  const generator = (fn, ...args) => new Promise(resolve => {
    enqueue(fn, resolve, args);
  });
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.size
    },
    clearQueue: {
      value: () => {
        queue.clear();
      }
    }
  });
  return generator;
}

export { pLimit };
