'use strict';

var time = require('./time-d8438852.cjs');

/* global requestIdleCallback, requestAnimationFrame, cancelIdleCallback, cancelAnimationFrame */

/**
 * Utility module to work with EcmaScript's event loop.
 *
 * @module eventloop
 */

/**
 * @type {Array<function>}
 */
let queue = [];

const _runQueue = () => {
  for (let i = 0; i < queue.length; i++) {
    queue[i]();
  }
  queue = [];
};

/**
 * @param {function():void} f
 */
const enqueue = f => {
  queue.push(f);
  if (queue.length === 1) {
    setTimeout(_runQueue, 0);
  }
};

/**
 * @typedef {Object} TimeoutObject
 * @property {function} TimeoutObject.destroy
 */

/**
 * @param {function(number):void} clearFunction
 */
const createTimeoutClass = clearFunction => class TT {
  /**
   * @param {number} timeoutId
   */
  constructor (timeoutId) {
    this._ = timeoutId;
  }

  destroy () {
    clearFunction(this._);
  }
};

const Timeout = createTimeoutClass(clearTimeout);

/**
 * @param {number} timeout
 * @param {function} callback
 * @return {TimeoutObject}
 */
const timeout = (timeout, callback) => new Timeout(setTimeout(callback, timeout));

const Interval = createTimeoutClass(clearInterval);

/**
 * @param {number} timeout
 * @param {function} callback
 * @return {TimeoutObject}
 */
const interval = (timeout, callback) => new Interval(setInterval(callback, timeout));

/* c8 ignore next */
const Animation = createTimeoutClass(arg => typeof requestAnimationFrame !== 'undefined' && cancelAnimationFrame(arg));

/**
 * @param {function(number):void} cb
 * @return {TimeoutObject}
 */
/* c8 ignore next */
const animationFrame = cb => typeof requestAnimationFrame === 'undefined' ? timeout(0, cb) : new Animation(requestAnimationFrame(cb));

/* c8 ignore next */
// @ts-ignore
const Idle = createTimeoutClass(arg => typeof cancelIdleCallback !== 'undefined' && cancelIdleCallback(arg));

/**
 * Note: this is experimental and is probably only useful in browsers.
 *
 * @param {function} cb
 * @return {TimeoutObject}
 */
/* c8 ignore next 2 */
// @ts-ignore
const idleCallback = cb => typeof requestIdleCallback !== 'undefined' ? new Idle(requestIdleCallback(cb)) : timeout(1000, cb);

/**
 * @param {number} timeout Timeout of the debounce action
 * @param {number} triggerAfter Optional. Trigger callback after a certain amount of time
 *                              without waiting for debounce.
 */
const createDebouncer = (timeout, triggerAfter = -1) => {
  let timer = -1;
  /**
   * @type {number?}
    */
  let lastCall = null;
  /**
   * @param {((...args: any)=>void)?} cb function to trigger after debounce. If null, it will reset the
   *                         debounce.
   */
  return cb => {
    clearTimeout(timer);
    if (cb) {
      if (triggerAfter >= 0) {
        const now = time.getUnixTime();
        if (lastCall === null) lastCall = now;
        if (now - lastCall > triggerAfter) {
          lastCall = null;
          timer = /** @type {any} */ (setTimeout(cb, 0));
          return
        }
      }
      timer = /** @type {any} */ (setTimeout(() => { lastCall = null; cb(); }, timeout));
    } else {
      lastCall = null;
    }
  }
};

var eventloop = /*#__PURE__*/Object.freeze({
  __proto__: null,
  enqueue: enqueue,
  timeout: timeout,
  interval: interval,
  Animation: Animation,
  animationFrame: animationFrame,
  idleCallback: idleCallback,
  createDebouncer: createDebouncer
});

exports.Animation = Animation;
exports.animationFrame = animationFrame;
exports.createDebouncer = createDebouncer;
exports.enqueue = enqueue;
exports.eventloop = eventloop;
exports.idleCallback = idleCallback;
exports.interval = interval;
exports.timeout = timeout;
//# sourceMappingURL=eventloop-a0168106.cjs.map
