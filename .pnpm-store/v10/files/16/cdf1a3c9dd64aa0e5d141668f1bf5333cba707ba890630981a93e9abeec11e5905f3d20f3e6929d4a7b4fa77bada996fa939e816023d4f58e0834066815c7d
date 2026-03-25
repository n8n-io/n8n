import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import "./chunk-DRM3MJ7Y.js";

// ../node_modules/yocto-queue/index.js
var Node = class {
  value;
  next;
  constructor(value) {
    this.value = value;
  }
}, Queue = class {
  #head;
  #tail;
  #size;
  constructor() {
    this.clear();
  }
  enqueue(value) {
    let node = new Node(value);
    this.#head ? (this.#tail.next = node, this.#tail = node) : (this.#head = node, this.#tail = node), this.#size++;
  }
  dequeue() {
    let current = this.#head;
    if (current)
      return this.#head = this.#head.next, this.#size--, this.#head || (this.#tail = void 0), current.value;
  }
  peek() {
    if (this.#head)
      return this.#head.value;
  }
  clear() {
    this.#head = void 0, this.#tail = void 0, this.#size = 0;
  }
  get size() {
    return this.#size;
  }
  *[Symbol.iterator]() {
    let current = this.#head;
    for (; current; )
      yield current.value, current = current.next;
  }
  *drain() {
    for (; this.#head; )
      yield this.dequeue();
  }
};

// ../node_modules/p-limit/index.js
function pLimit(concurrency) {
  validateConcurrency(concurrency);
  let queue = new Queue(), activeCount = 0, resumeNext = () => {
    activeCount < concurrency && queue.size > 0 && (queue.dequeue()(), activeCount++);
  }, next = () => {
    activeCount--, resumeNext();
  }, run = async (function_, resolve, arguments_) => {
    let result = (async () => function_(...arguments_))();
    resolve(result);
    try {
      await result;
    } catch {
    }
    next();
  }, enqueue = (function_, resolve, arguments_) => {
    new Promise((internalResolve) => {
      queue.enqueue(internalResolve);
    }).then(
      run.bind(void 0, function_, resolve, arguments_)
    ), (async () => (await Promise.resolve(), activeCount < concurrency && resumeNext()))();
  }, generator = (function_, ...arguments_) => new Promise((resolve) => {
    enqueue(function_, resolve, arguments_);
  });
  return Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.size
    },
    clearQueue: {
      value() {
        queue.clear();
      }
    },
    concurrency: {
      get: () => concurrency,
      set(newConcurrency) {
        validateConcurrency(newConcurrency), concurrency = newConcurrency, queueMicrotask(() => {
          for (; activeCount < concurrency && queue.size > 0; )
            resumeNext();
        });
      }
    }
  }), generator;
}
function limitFunction(function_, option) {
  let { concurrency } = option, limit = pLimit(concurrency);
  return (...arguments_) => limit(() => function_(...arguments_));
}
function validateConcurrency(concurrency) {
  if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0))
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
}
export {
  pLimit as default,
  limitFunction
};
