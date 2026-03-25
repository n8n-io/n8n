function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function sum(...args) {
  return flattenArrayable(args).reduce((a, b) => a + b, 0);
}
function lerp(min, max, t) {
  const interpolation = clamp(t, 0, 1);
  return min + (max - min) * interpolation;
}
function remap(n, inMin, inMax, outMin, outMax) {
  const interpolation = (n - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, interpolation);
}

function toArray(array) {
  array = array ?? [];
  return Array.isArray(array) ? array : [array];
}
function flattenArrayable(array) {
  return toArray(array).flat(1);
}
function mergeArrayable(...args) {
  return args.flatMap((i) => toArray(i));
}
function partition(array, ...filters) {
  const result = Array.from({ length: filters.length + 1 }).fill(null).map(() => []);
  array.forEach((e, idx, arr) => {
    let i = 0;
    for (const filter of filters) {
      if (filter(e, idx, arr)) {
        result[i].push(e);
        return;
      }
      i += 1;
    }
    result[i].push(e);
  });
  return result;
}
function uniq(array) {
  return Array.from(new Set(array));
}
function uniqueBy(array, equalFn) {
  return array.reduce((acc, cur) => {
    const index = acc.findIndex((item) => equalFn(cur, item));
    if (index === -1)
      acc.push(cur);
    return acc;
  }, []);
}
function last(array) {
  return at(array, -1);
}
function remove(array, value) {
  if (!array)
    return false;
  const index = array.indexOf(value);
  if (index >= 0) {
    array.splice(index, 1);
    return true;
  }
  return false;
}
function at(array, index) {
  const len = array.length;
  if (!len)
    return void 0;
  if (index < 0)
    index += len;
  return array[index];
}
function range(...args) {
  let start, stop, step;
  if (args.length === 1) {
    start = 0;
    step = 1;
    [stop] = args;
  } else {
    [start, stop, step = 1] = args;
  }
  const arr = [];
  let current = start;
  while (current < stop) {
    arr.push(current);
    current += step || 1;
  }
  return arr;
}
function move(arr, from, to) {
  arr.splice(to, 0, arr.splice(from, 1)[0]);
  return arr;
}
function clampArrayRange(n, arr) {
  return clamp(n, 0, arr.length - 1);
}
function sample(arr, quantity) {
  return Array.from({ length: quantity }, (_) => arr[Math.round(Math.random() * (arr.length - 1))]);
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function assert(condition, message) {
  if (!condition)
    throw new Error(message);
}
const toString = (v) => Object.prototype.toString.call(v);
function getTypeName(v) {
  if (v === null)
    return "null";
  const type = toString(v).slice(8, -1).toLowerCase();
  return typeof v === "object" || typeof v === "function" ? type : typeof v;
}
function noop() {
}

function isDeepEqual(value1, value2) {
  const type1 = getTypeName(value1);
  const type2 = getTypeName(value2);
  if (type1 !== type2)
    return false;
  if (type1 === "array") {
    if (value1.length !== value2.length)
      return false;
    return value1.every((item, i) => {
      return isDeepEqual(item, value2[i]);
    });
  }
  if (type1 === "object") {
    const keyArr = Object.keys(value1);
    if (keyArr.length !== Object.keys(value2).length)
      return false;
    return keyArr.every((key) => {
      return isDeepEqual(value1[key], value2[key]);
    });
  }
  return Object.is(value1, value2);
}

function notNullish(v) {
  return v != null;
}
function noNull(v) {
  return v !== null;
}
function notUndefined(v) {
  return v !== void 0;
}
function isTruthy(v) {
  return Boolean(v);
}

const isDef = (val) => typeof val !== "undefined";
const isBoolean = (val) => typeof val === "boolean";
const isFunction = (val) => typeof val === "function";
const isNumber = (val) => typeof val === "number";
const isString = (val) => typeof val === "string";
const isObject = (val) => toString(val) === "[object Object]";
const isUndefined = (val) => toString(val) === "[object Undefined]";
const isNull = (val) => toString(val) === "[object Null]";
const isRegExp = (val) => toString(val) === "[object RegExp]";
const isDate = (val) => toString(val) === "[object Date]";
const isWindow = (val) => typeof window !== "undefined" && toString(val) === "[object Window]";
const isBrowser = typeof window !== "undefined";

function slash(str) {
  return str.replace(/\\/g, "/");
}
function ensurePrefix(prefix, str) {
  if (!str.startsWith(prefix))
    return prefix + str;
  return str;
}
function ensureSuffix(suffix, str) {
  if (!str.endsWith(suffix))
    return str + suffix;
  return str;
}
function template(str, ...args) {
  const [firstArg, fallback] = args;
  if (isObject(firstArg)) {
    const vars = firstArg;
    return str.replace(/{([\w\d]+)}/g, (_, key) => vars[key] || ((typeof fallback === "function" ? fallback(key) : fallback) ?? key));
  } else {
    return str.replace(/{(\d+)}/g, (_, key) => {
      const index = Number(key);
      if (Number.isNaN(index))
        return key;
      return args[index];
    });
  }
}
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function randomStr(size = 16, dict = urlAlphabet) {
  let id = "";
  let i = size;
  const len = dict.length;
  while (i--)
    id += dict[Math.random() * len | 0];
  return id;
}
function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
const _reFullWs = /^\s*$/;
function unindent(str) {
  const lines = (typeof str === "string" ? str : str[0]).split("\n");
  const whitespaceLines = lines.map((line) => _reFullWs.test(line));
  const commonIndent = lines.reduce((min, line, idx) => {
    var _a;
    if (whitespaceLines[idx])
      return min;
    const indent = (_a = line.match(/^\s*/)) == null ? void 0 : _a[0].length;
    return indent === void 0 ? min : Math.min(min, indent);
  }, Number.POSITIVE_INFINITY);
  let emptyLinesHead = 0;
  while (emptyLinesHead < lines.length && whitespaceLines[emptyLinesHead])
    emptyLinesHead++;
  let emptyLinesTail = 0;
  while (emptyLinesTail < lines.length && whitespaceLines[lines.length - emptyLinesTail - 1])
    emptyLinesTail++;
  return lines.slice(emptyLinesHead, lines.length - emptyLinesTail).map((line) => line.slice(commonIndent)).join("\n");
}

const timestamp = () => +Date.now();

function batchInvoke(functions) {
  functions.forEach((fn) => fn && fn());
}
function invoke(fn) {
  return fn();
}
function tap(value, callback) {
  callback(value);
  return value;
}

function objectMap(obj, fn) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => fn(k, v)).filter(notNullish)
  );
}
function isKeyOf(obj, k) {
  return k in obj;
}
function objectKeys(obj) {
  return Object.keys(obj);
}
function objectEntries(obj) {
  return Object.entries(obj);
}
function deepMerge(target, ...sources) {
  if (!sources.length)
    return target;
  const source = sources.shift();
  if (source === void 0)
    return target;
  if (isMergableObject(target) && isMergableObject(source)) {
    objectKeys(source).forEach((key) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype")
        return;
      if (isMergableObject(source[key])) {
        if (!target[key])
          target[key] = {};
        if (isMergableObject(target[key])) {
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      } else {
        target[key] = source[key];
      }
    });
  }
  return deepMerge(target, ...sources);
}
function deepMergeWithArray(target, ...sources) {
  if (!sources.length)
    return target;
  const source = sources.shift();
  if (source === void 0)
    return target;
  if (Array.isArray(target) && Array.isArray(source))
    target.push(...source);
  if (isMergableObject(target) && isMergableObject(source)) {
    objectKeys(source).forEach((key) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype")
        return;
      if (Array.isArray(source[key])) {
        if (!target[key])
          target[key] = [];
        deepMergeWithArray(target[key], source[key]);
      } else if (isMergableObject(source[key])) {
        if (!target[key])
          target[key] = {};
        deepMergeWithArray(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }
  return deepMergeWithArray(target, ...sources);
}
function isMergableObject(item) {
  return isObject(item) && !Array.isArray(item);
}
function objectPick(obj, keys, omitUndefined = false) {
  return keys.reduce((n, k) => {
    if (k in obj) {
      if (!omitUndefined || obj[k] !== void 0)
        n[k] = obj[k];
    }
    return n;
  }, {});
}
function clearUndefined(obj) {
  Object.keys(obj).forEach((key) => obj[key] === void 0 ? delete obj[key] : {});
  return obj;
}
function hasOwnProperty(obj, v) {
  if (obj == null)
    return false;
  return Object.prototype.hasOwnProperty.call(obj, v);
}

function createSingletonPromise(fn) {
  let _promise;
  function wrapper() {
    if (!_promise)
      _promise = fn();
    return _promise;
  }
  wrapper.reset = async () => {
    const _prev = _promise;
    _promise = void 0;
    if (_prev)
      await _prev;
  };
  return wrapper;
}
function sleep(ms, callback) {
  return new Promise(
    (resolve) => setTimeout(async () => {
      await (callback == null ? void 0 : callback());
      resolve();
    }, ms)
  );
}
function createPromiseLock() {
  const locks = [];
  return {
    async run(fn) {
      const p = fn();
      locks.push(p);
      try {
        return await p;
      } finally {
        remove(locks, p);
      }
    },
    async wait() {
      await Promise.allSettled(locks);
    },
    isWaiting() {
      return Boolean(locks.length);
    },
    clear() {
      locks.length = 0;
    }
  };
}
function createControlledPromise() {
  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

/* eslint-disable no-undefined,no-param-reassign,no-shadow */

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param {number} delay -                  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher)
 *                                            are most useful.
 * @param {Function} callback -               A function to be executed after delay milliseconds. The `this` context and all arguments are passed through,
 *                                            as-is, to `callback` when the throttled-function is executed.
 * @param {object} [options] -              An object to configure options.
 * @param {boolean} [options.noTrailing] -   Optional, defaults to false. If noTrailing is true, callback will only execute every `delay` milliseconds
 *                                            while the throttled-function is being called. If noTrailing is false or unspecified, callback will be executed
 *                                            one final time after the last throttled-function call. (After the throttled-function has not been called for
 *                                            `delay` milliseconds, the internal counter is reset).
 * @param {boolean} [options.noLeading] -   Optional, defaults to false. If noLeading is false, the first throttled-function call will execute callback
 *                                            immediately. If noLeading is true, the first the callback execution will be skipped. It should be noted that
 *                                            callback will never executed if both noLeading = true and noTrailing = true.
 * @param {boolean} [options.debounceMode] - If `debounceMode` is true (at begin), schedule `clear` to execute after `delay` ms. If `debounceMode` is
 *                                            false (at end), schedule `callback` to execute after `delay` ms.
 *
 * @returns {Function} A new, throttled, function.
 */
function throttle (delay, callback, options) {
  var _ref = options || {},
      _ref$noTrailing = _ref.noTrailing,
      noTrailing = _ref$noTrailing === void 0 ? false : _ref$noTrailing,
      _ref$noLeading = _ref.noLeading,
      noLeading = _ref$noLeading === void 0 ? false : _ref$noLeading,
      _ref$debounceMode = _ref.debounceMode,
      debounceMode = _ref$debounceMode === void 0 ? undefined : _ref$debounceMode;
  /*
   * After wrapper has stopped being called, this timeout ensures that
   * `callback` is executed at the proper times in `throttle` and `end`
   * debounce modes.
   */


  var timeoutID;
  var cancelled = false; // Keep track of the last time `callback` was executed.

  var lastExec = 0; // Function to clear existing timeout

  function clearExistingTimeout() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
  } // Function to cancel next exec


  function cancel(options) {
    var _ref2 = options || {},
        _ref2$upcomingOnly = _ref2.upcomingOnly,
        upcomingOnly = _ref2$upcomingOnly === void 0 ? false : _ref2$upcomingOnly;

    clearExistingTimeout();
    cancelled = !upcomingOnly;
  }
  /*
   * The `wrapper` function encapsulates all of the throttling / debouncing
   * functionality and when executed will limit the rate at which `callback`
   * is executed.
   */


  function wrapper() {
    for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
      arguments_[_key] = arguments[_key];
    }

    var self = this;
    var elapsed = Date.now() - lastExec;

    if (cancelled) {
      return;
    } // Execute `callback` and update the `lastExec` timestamp.


    function exec() {
      lastExec = Date.now();
      callback.apply(self, arguments_);
    }
    /*
     * If `debounceMode` is true (at begin) this is used to clear the flag
     * to allow future `callback` executions.
     */


    function clear() {
      timeoutID = undefined;
    }

    if (!noLeading && debounceMode && !timeoutID) {
      /*
       * Since `wrapper` is being called for the first time and
       * `debounceMode` is true (at begin), execute `callback`
       * and noLeading != true.
       */
      exec();
    }

    clearExistingTimeout();

    if (debounceMode === undefined && elapsed > delay) {
      if (noLeading) {
        /*
         * In throttle mode with noLeading, if `delay` time has
         * been exceeded, update `lastExec` and schedule `callback`
         * to execute after `delay` ms.
         */
        lastExec = Date.now();

        if (!noTrailing) {
          timeoutID = setTimeout(debounceMode ? clear : exec, delay);
        }
      } else {
        /*
         * In throttle mode without noLeading, if `delay` time has been exceeded, execute
         * `callback`.
         */
        exec();
      }
    } else if (noTrailing !== true) {
      /*
       * In trailing throttle mode, since `delay` time has not been
       * exceeded, schedule `callback` to execute `delay` ms after most
       * recent execution.
       *
       * If `debounceMode` is true (at begin), schedule `clear` to execute
       * after `delay` ms.
       *
       * If `debounceMode` is false (at end), schedule `callback` to
       * execute after `delay` ms.
       */
      timeoutID = setTimeout(debounceMode ? clear : exec, debounceMode === undefined ? delay - elapsed : delay);
    }
  }

  wrapper.cancel = cancel; // Return the wrapper function.

  return wrapper;
}

/* eslint-disable no-undefined */
/**
 * Debounce execution of a function. Debouncing, unlike throttling,
 * guarantees that a function is only executed a single time, either at the
 * very beginning of a series of calls, or at the very end.
 *
 * @param {number} delay -               A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param {Function} callback -          A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
 *                                        to `callback` when the debounced-function is executed.
 * @param {object} [options] -           An object to configure options.
 * @param {boolean} [options.atBegin] -  Optional, defaults to false. If atBegin is false or unspecified, callback will only be executed `delay` milliseconds
 *                                        after the last debounced-function call. If atBegin is true, callback will be executed only at the first debounced-function call.
 *                                        (After the throttled-function has not been called for `delay` milliseconds, the internal counter is reset).
 *
 * @returns {Function} A new, debounced function.
 */

function debounce (delay, callback, options) {
  var _ref = options || {},
      _ref$atBegin = _ref.atBegin,
      atBegin = _ref$atBegin === void 0 ? false : _ref$atBegin;

  return throttle(delay, callback, {
    debounceMode: atBegin !== false
  });
}

/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/

class Node {
	value;
	next;

	constructor(value) {
		this.value = value;
	}
}

class Queue {
	#head;
	#tail;
	#size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this.#head) {
			this.#tail.next = node;
			this.#tail = node;
		} else {
			this.#head = node;
			this.#tail = node;
		}

		this.#size++;
	}

	dequeue() {
		const current = this.#head;
		if (!current) {
			return;
		}

		this.#head = this.#head.next;
		this.#size--;
		return current.value;
	}

	clear() {
		this.#head = undefined;
		this.#tail = undefined;
		this.#size = 0;
	}

	get size() {
		return this.#size;
	}

	* [Symbol.iterator]() {
		let current = this.#head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}
}

const AsyncResource = {
	bind(fn, _type, thisArg) {
		return fn.bind(thisArg);
	},
};

function pLimit(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (function_, resolve, arguments_) => {
		activeCount++;

		const result = (async () => function_(...arguments_))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (function_, resolve, arguments_) => {
		queue.enqueue(
			AsyncResource.bind(run.bind(undefined, function_, resolve, arguments_)),
		);

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (function_, ...arguments_) => new Promise(resolve => {
		enqueue(function_, resolve, arguments_);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value() {
				queue.clear();
			},
		},
	});

	return generator;
}

const VOID = Symbol("p-void");
class PInstance extends Promise {
  constructor(items = [], options) {
    super(() => {
    });
    this.items = items;
    this.options = options;
    this.promises = /* @__PURE__ */ new Set();
  }
  get promise() {
    var _a;
    let batch;
    const items = [...Array.from(this.items), ...Array.from(this.promises)];
    if ((_a = this.options) == null ? void 0 : _a.concurrency) {
      const limit = pLimit(this.options.concurrency);
      batch = Promise.all(items.map((p2) => limit(() => p2)));
    } else {
      batch = Promise.all(items);
    }
    return batch.then((l) => l.filter((i) => i !== VOID));
  }
  add(...args) {
    args.forEach((i) => {
      this.promises.add(i);
    });
  }
  map(fn) {
    return new PInstance(
      Array.from(this.items).map(async (i, idx) => {
        const v = await i;
        if (v === VOID)
          return VOID;
        return fn(v, idx);
      }),
      this.options
    );
  }
  filter(fn) {
    return new PInstance(
      Array.from(this.items).map(async (i, idx) => {
        const v = await i;
        const r = await fn(v, idx);
        if (!r)
          return VOID;
        return v;
      }),
      this.options
    );
  }
  forEach(fn) {
    return this.map(fn).then();
  }
  reduce(fn, initialValue) {
    return this.promise.then((array) => array.reduce(fn, initialValue));
  }
  clear() {
    this.promises.clear();
  }
  then(fn) {
    const p2 = this.promise;
    if (fn)
      return p2.then(fn);
    else
      return p2;
  }
  catch(fn) {
    return this.promise.catch(fn);
  }
  finally(fn) {
    return this.promise.finally(fn);
  }
}
function p(items, options) {
  return new PInstance(items, options);
}

export { assert, at, batchInvoke, capitalize, clamp, clampArrayRange, clearUndefined, createControlledPromise, createPromiseLock, createSingletonPromise, debounce, deepMerge, deepMergeWithArray, ensurePrefix, ensureSuffix, flattenArrayable, getTypeName, hasOwnProperty, invoke, isBoolean, isBrowser, isDate, isDeepEqual, isDef, isFunction, isKeyOf, isNull, isNumber, isObject, isRegExp, isString, isTruthy, isUndefined, isWindow, last, lerp, mergeArrayable, move, noNull, noop, notNullish, notUndefined, objectEntries, objectKeys, objectMap, objectPick, p, partition, randomStr, range, remap, remove, sample, shuffle, slash, sleep, sum, tap, template, throttle, timestamp, toArray, toString, unindent, uniq, uniqueBy };
