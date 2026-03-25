"use strict";


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_index = require('../../../../eventemitter3@4.0.7/node_modules/eventemitter3/index.cjs');
const require_index$1 = require('../../../../p-timeout@3.2.0/node_modules/p-timeout/index.cjs');
const require_priority_queue$1 = require('./priority-queue.cjs');

//#region ../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/index.js
var require_dist = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/index.js": ((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const EventEmitter = require_index.require_eventemitter3();
	const p_timeout_1 = require_index$1.require_p_timeout();
	const priority_queue_1 = require_priority_queue$1.require_priority_queue();
	const empty = () => {};
	const timeoutError = new p_timeout_1.TimeoutError();
	/**
	Promise queue with concurrency control.
	*/
	var PQueue = class extends EventEmitter {
		constructor(options) {
			var _a, _b, _c, _d;
			super();
			this._intervalCount = 0;
			this._intervalEnd = 0;
			this._pendingCount = 0;
			this._resolveEmpty = empty;
			this._resolveIdle = empty;
			options = Object.assign({
				carryoverConcurrencyCount: false,
				intervalCap: Infinity,
				interval: 0,
				concurrency: Infinity,
				autoStart: true,
				queueClass: priority_queue_1.default
			}, options);
			if (!(typeof options.intervalCap === "number" && options.intervalCap >= 1)) throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${(_b = (_a = options.intervalCap) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : ""}\` (${typeof options.intervalCap})`);
			if (options.interval === void 0 || !(Number.isFinite(options.interval) && options.interval >= 0)) throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${(_d = (_c = options.interval) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""}\` (${typeof options.interval})`);
			this._carryoverConcurrencyCount = options.carryoverConcurrencyCount;
			this._isIntervalIgnored = options.intervalCap === Infinity || options.interval === 0;
			this._intervalCap = options.intervalCap;
			this._interval = options.interval;
			this._queue = new options.queueClass();
			this._queueClass = options.queueClass;
			this.concurrency = options.concurrency;
			this._timeout = options.timeout;
			this._throwOnTimeout = options.throwOnTimeout === true;
			this._isPaused = options.autoStart === false;
		}
		get _doesIntervalAllowAnother() {
			return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
		}
		get _doesConcurrentAllowAnother() {
			return this._pendingCount < this._concurrency;
		}
		_next() {
			this._pendingCount--;
			this._tryToStartAnother();
			this.emit("next");
		}
		_resolvePromises() {
			this._resolveEmpty();
			this._resolveEmpty = empty;
			if (this._pendingCount === 0) {
				this._resolveIdle();
				this._resolveIdle = empty;
				this.emit("idle");
			}
		}
		_onResumeInterval() {
			this._onInterval();
			this._initializeIntervalIfNeeded();
			this._timeoutId = void 0;
		}
		_isIntervalPaused() {
			const now = Date.now();
			if (this._intervalId === void 0) {
				const delay = this._intervalEnd - now;
				if (delay < 0) this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
				else {
					if (this._timeoutId === void 0) this._timeoutId = setTimeout(() => {
						this._onResumeInterval();
					}, delay);
					return true;
				}
			}
			return false;
		}
		_tryToStartAnother() {
			if (this._queue.size === 0) {
				if (this._intervalId) clearInterval(this._intervalId);
				this._intervalId = void 0;
				this._resolvePromises();
				return false;
			}
			if (!this._isPaused) {
				const canInitializeInterval = !this._isIntervalPaused();
				if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
					const job = this._queue.dequeue();
					if (!job) return false;
					this.emit("active");
					job();
					if (canInitializeInterval) this._initializeIntervalIfNeeded();
					return true;
				}
			}
			return false;
		}
		_initializeIntervalIfNeeded() {
			if (this._isIntervalIgnored || this._intervalId !== void 0) return;
			this._intervalId = setInterval(() => {
				this._onInterval();
			}, this._interval);
			this._intervalEnd = Date.now() + this._interval;
		}
		_onInterval() {
			if (this._intervalCount === 0 && this._pendingCount === 0 && this._intervalId) {
				clearInterval(this._intervalId);
				this._intervalId = void 0;
			}
			this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
			this._processQueue();
		}
		/**
		Executes all queued functions until it reaches the limit.
		*/
		_processQueue() {
			while (this._tryToStartAnother());
		}
		get concurrency() {
			return this._concurrency;
		}
		set concurrency(newConcurrency) {
			if (!(typeof newConcurrency === "number" && newConcurrency >= 1)) throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
			this._concurrency = newConcurrency;
			this._processQueue();
		}
		/**
		Adds a sync or async task to the queue. Always returns a promise.
		*/
		async add(fn, options = {}) {
			return new Promise((resolve, reject) => {
				const run = async () => {
					this._pendingCount++;
					this._intervalCount++;
					try {
						const operation = this._timeout === void 0 && options.timeout === void 0 ? fn() : p_timeout_1.default(Promise.resolve(fn()), options.timeout === void 0 ? this._timeout : options.timeout, () => {
							if (options.throwOnTimeout === void 0 ? this._throwOnTimeout : options.throwOnTimeout) reject(timeoutError);
							return void 0;
						});
						resolve(await operation);
					} catch (error) {
						reject(error);
					}
					this._next();
				};
				this._queue.enqueue(run, options);
				this._tryToStartAnother();
				this.emit("add");
			});
		}
		/**
		Same as `.add()`, but accepts an array of sync or async functions.
		
		@returns A promise that resolves when all functions are resolved.
		*/
		async addAll(functions, options) {
			return Promise.all(functions.map(async (function_) => this.add(function_, options)));
		}
		/**
		Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
		*/
		start() {
			if (!this._isPaused) return this;
			this._isPaused = false;
			this._processQueue();
			return this;
		}
		/**
		Put queue execution on hold.
		*/
		pause() {
			this._isPaused = true;
		}
		/**
		Clear the queue.
		*/
		clear() {
			this._queue = new this._queueClass();
		}
		/**
		Can be called multiple times. Useful if you for example add additional items at a later time.
		
		@returns A promise that settles when the queue becomes empty.
		*/
		async onEmpty() {
			if (this._queue.size === 0) return;
			return new Promise((resolve) => {
				const existingResolve = this._resolveEmpty;
				this._resolveEmpty = () => {
					existingResolve();
					resolve();
				};
			});
		}
		/**
		The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.
		
		@returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
		*/
		async onIdle() {
			if (this._pendingCount === 0 && this._queue.size === 0) return;
			return new Promise((resolve) => {
				const existingResolve = this._resolveIdle;
				this._resolveIdle = () => {
					existingResolve();
					resolve();
				};
			});
		}
		/**
		Size of the queue.
		*/
		get size() {
			return this._queue.size;
		}
		/**
		Size of the queue, filtered by the given options.
		
		For example, this can be used to find the number of items remaining in the queue with a specific priority level.
		*/
		sizeBy(options) {
			return this._queue.filter(options).length;
		}
		/**
		Number of pending promises.
		*/
		get pending() {
			return this._pendingCount;
		}
		/**
		Whether the queue is currently paused.
		*/
		get isPaused() {
			return this._isPaused;
		}
		get timeout() {
			return this._timeout;
		}
		/**
		Set the timeout for future operations.
		*/
		set timeout(milliseconds) {
			this._timeout = milliseconds;
		}
	};
	exports.default = PQueue;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_dist();
  }
});
//# sourceMappingURL=index.cjs.map