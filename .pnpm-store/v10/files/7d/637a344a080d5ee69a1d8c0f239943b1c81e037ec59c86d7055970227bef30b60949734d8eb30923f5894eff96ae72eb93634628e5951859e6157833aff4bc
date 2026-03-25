import { EventEmitter } from 'eventemitter3';
import pTimeout from 'p-timeout';
import PriorityQueue from './priority-queue.js';
/**
Promise queue with concurrency control.
*/
export default class PQueue extends EventEmitter {
    #carryoverIntervalCount;
    #isIntervalIgnored;
    #intervalCount = 0;
    #intervalCap;
    #rateLimitedInInterval = false;
    #rateLimitFlushScheduled = false;
    #interval;
    #intervalEnd = 0;
    #lastExecutionTime = 0;
    #intervalId;
    #timeoutId;
    #strict;
    // Circular buffer implementation for better performance
    #strictTicks = [];
    #strictTicksStartIndex = 0;
    #queue;
    #queueClass;
    #pending = 0;
    // The `!` is needed because of https://github.com/microsoft/TypeScript/issues/32194
    #concurrency;
    #isPaused;
    // Use to assign a unique identifier to a promise function, if not explicitly specified
    #idAssigner = 1n;
    // Track currently running tasks for debugging
    #runningTasks = new Map();
    /**
    Get or set the default timeout for all tasks. Can be changed at runtime.

    Operations will throw a `TimeoutError` if they don't complete within the specified time.

    The timeout begins when the operation is dequeued and starts execution, not while it's waiting in the queue.

    @example
    ```
    const queue = new PQueue({timeout: 5000});

    // Change timeout for all future tasks
    queue.timeout = 10000;
    ```
    */
    timeout;
    constructor(options) {
        super();
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        options = {
            carryoverIntervalCount: false,
            intervalCap: Number.POSITIVE_INFINITY,
            interval: 0,
            concurrency: Number.POSITIVE_INFINITY,
            autoStart: true,
            queueClass: PriorityQueue,
            strict: false,
            ...options,
        };
        if (!(typeof options.intervalCap === 'number' && options.intervalCap >= 1)) {
            throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${options.intervalCap?.toString() ?? ''}\` (${typeof options.intervalCap})`);
        }
        if (options.interval === undefined || !(Number.isFinite(options.interval) && options.interval >= 0)) {
            throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${options.interval?.toString() ?? ''}\` (${typeof options.interval})`);
        }
        if (options.strict && options.interval === 0) {
            throw new TypeError('The `strict` option requires a non-zero `interval`');
        }
        if (options.strict && options.intervalCap === Number.POSITIVE_INFINITY) {
            throw new TypeError('The `strict` option requires a finite `intervalCap`');
        }
        // TODO: Remove this fallback in the next major version
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.#carryoverIntervalCount = options.carryoverIntervalCount ?? options.carryoverConcurrencyCount ?? false;
        this.#isIntervalIgnored = options.intervalCap === Number.POSITIVE_INFINITY || options.interval === 0;
        this.#intervalCap = options.intervalCap;
        this.#interval = options.interval;
        this.#strict = options.strict;
        this.#queue = new options.queueClass();
        this.#queueClass = options.queueClass;
        this.concurrency = options.concurrency;
        if (options.timeout !== undefined && !(Number.isFinite(options.timeout) && options.timeout > 0)) {
            throw new TypeError(`Expected \`timeout\` to be a positive finite number, got \`${options.timeout}\` (${typeof options.timeout})`);
        }
        this.timeout = options.timeout;
        this.#isPaused = options.autoStart === false;
        this.#setupRateLimitTracking();
    }
    #cleanupStrictTicks(now) {
        // Remove ticks outside the current interval window using circular buffer approach
        while (this.#strictTicksStartIndex < this.#strictTicks.length) {
            const oldestTick = this.#strictTicks[this.#strictTicksStartIndex];
            if (oldestTick !== undefined && now - oldestTick >= this.#interval) {
                this.#strictTicksStartIndex++;
            }
            else {
                break;
            }
        }
        // Compact the array when it becomes inefficient or fully consumed
        // Compact when: (start index is large AND more than half wasted) OR all ticks expired
        const shouldCompact = (this.#strictTicksStartIndex > 100 && this.#strictTicksStartIndex > this.#strictTicks.length / 2)
            || this.#strictTicksStartIndex === this.#strictTicks.length;
        if (shouldCompact) {
            this.#strictTicks = this.#strictTicks.slice(this.#strictTicksStartIndex);
            this.#strictTicksStartIndex = 0;
        }
    }
    // Helper methods for interval consumption
    #consumeIntervalSlot(now) {
        if (this.#strict) {
            this.#strictTicks.push(now);
        }
        else {
            this.#intervalCount++;
        }
    }
    #rollbackIntervalSlot() {
        if (this.#strict) {
            // Pop from the end of the actual data (not from start index)
            if (this.#strictTicks.length > this.#strictTicksStartIndex) {
                this.#strictTicks.pop();
            }
        }
        else if (this.#intervalCount > 0) {
            this.#intervalCount--;
        }
    }
    #getActiveTicksCount() {
        return this.#strictTicks.length - this.#strictTicksStartIndex;
    }
    get #doesIntervalAllowAnother() {
        if (this.#isIntervalIgnored) {
            return true;
        }
        if (this.#strict) {
            // Cleanup already done by #isIntervalPausedAt before this is called
            return this.#getActiveTicksCount() < this.#intervalCap;
        }
        return this.#intervalCount < this.#intervalCap;
    }
    get #doesConcurrentAllowAnother() {
        return this.#pending < this.#concurrency;
    }
    #next() {
        this.#pending--;
        if (this.#pending === 0) {
            this.emit('pendingZero');
        }
        this.#tryToStartAnother();
        this.emit('next');
    }
    #onResumeInterval() {
        // Clear timeout ID before processing to prevent race condition
        // Must clear before #onInterval to allow new timeouts to be scheduled
        this.#timeoutId = undefined;
        this.#onInterval();
        this.#initializeIntervalIfNeeded();
    }
    #isIntervalPausedAt(now) {
        // Strict mode: check if we need to wait for oldest tick to age out
        if (this.#strict) {
            this.#cleanupStrictTicks(now);
            // If at capacity, need to wait for oldest tick to age out
            const activeTicksCount = this.#getActiveTicksCount();
            if (activeTicksCount >= this.#intervalCap) {
                const oldestTick = this.#strictTicks[this.#strictTicksStartIndex];
                // After cleanup, remaining ticks are within interval, so delay is always > 0
                const delay = this.#interval - (now - oldestTick);
                this.#createIntervalTimeout(delay);
                return true;
            }
            return false;
        }
        // Fixed window mode (original logic)
        if (this.#intervalId === undefined) {
            const delay = this.#intervalEnd - now;
            if (delay < 0) {
                // If the interval has expired while idle, check if we should enforce the interval
                // from the last task execution. This ensures proper spacing between tasks even
                // when the queue becomes empty and then new tasks are added.
                if (this.#lastExecutionTime > 0) {
                    const timeSinceLastExecution = now - this.#lastExecutionTime;
                    if (timeSinceLastExecution < this.#interval) {
                        // Not enough time has passed since the last task execution
                        this.#createIntervalTimeout(this.#interval - timeSinceLastExecution);
                        return true;
                    }
                }
                // Enough time has passed or no previous execution, allow execution
                this.#intervalCount = (this.#carryoverIntervalCount) ? this.#pending : 0;
            }
            else {
                // Act as the interval is pending
                this.#createIntervalTimeout(delay);
                return true;
            }
        }
        return false;
    }
    #createIntervalTimeout(delay) {
        if (this.#timeoutId !== undefined) {
            return;
        }
        this.#timeoutId = setTimeout(() => {
            this.#onResumeInterval();
        }, delay);
    }
    #clearIntervalTimer() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = undefined;
        }
    }
    #clearTimeoutTimer() {
        if (this.#timeoutId) {
            clearTimeout(this.#timeoutId);
            this.#timeoutId = undefined;
        }
    }
    #tryToStartAnother() {
        if (this.#queue.size === 0) {
            // We can clear the interval ("pause")
            // Because we can redo it later ("resume")
            this.#clearIntervalTimer();
            this.emit('empty');
            if (this.#pending === 0) {
                // Clear timeout as well when completely idle
                this.#clearTimeoutTimer();
                // Compact strict ticks when idle to free memory
                if (this.#strict && this.#strictTicksStartIndex > 0) {
                    const now = Date.now();
                    this.#cleanupStrictTicks(now);
                }
                this.emit('idle');
            }
            return false;
        }
        let taskStarted = false;
        if (!this.#isPaused) {
            const now = Date.now();
            const canInitializeInterval = !this.#isIntervalPausedAt(now);
            if (this.#doesIntervalAllowAnother && this.#doesConcurrentAllowAnother) {
                const job = this.#queue.dequeue();
                if (!this.#isIntervalIgnored) {
                    this.#consumeIntervalSlot(now);
                    this.#scheduleRateLimitUpdate();
                }
                this.emit('active');
                job();
                if (canInitializeInterval) {
                    this.#initializeIntervalIfNeeded();
                }
                taskStarted = true;
            }
        }
        return taskStarted;
    }
    #initializeIntervalIfNeeded() {
        if (this.#isIntervalIgnored || this.#intervalId !== undefined) {
            return;
        }
        // Strict mode uses timeouts instead of interval timers
        if (this.#strict) {
            return;
        }
        this.#intervalId = setInterval(() => {
            this.#onInterval();
        }, this.#interval);
        this.#intervalEnd = Date.now() + this.#interval;
    }
    #onInterval() {
        // Non-strict mode uses interval timers and intervalCount
        if (!this.#strict) {
            if (this.#intervalCount === 0 && this.#pending === 0 && this.#intervalId) {
                this.#clearIntervalTimer();
            }
            this.#intervalCount = this.#carryoverIntervalCount ? this.#pending : 0;
        }
        this.#processQueue();
        this.#scheduleRateLimitUpdate();
    }
    /**
    Executes all queued functions until it reaches the limit.
    */
    #processQueue() {
        // eslint-disable-next-line no-empty
        while (this.#tryToStartAnother()) { }
    }
    get concurrency() {
        return this.#concurrency;
    }
    set concurrency(newConcurrency) {
        if (!(typeof newConcurrency === 'number' && newConcurrency >= 1)) {
            throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
        }
        this.#concurrency = newConcurrency;
        this.#processQueue();
    }
    /**
    Updates the priority of a promise function by its id, affecting its execution order. Requires a defined concurrency limit to take effect.

    For example, this can be used to prioritize a promise function to run earlier.

    ```js
    import PQueue from 'p-queue';

    const queue = new PQueue({concurrency: 1});

    queue.add(async () => '🦄', {priority: 1});
    queue.add(async () => '🦀', {priority: 0, id: '🦀'});
    queue.add(async () => '🦄', {priority: 1});
    queue.add(async () => '🦄', {priority: 1});

    queue.setPriority('🦀', 2);
    ```

    In this case, the promise function with `id: '🦀'` runs second.

    You can also deprioritize a promise function to delay its execution:

    ```js
    import PQueue from 'p-queue';

    const queue = new PQueue({concurrency: 1});

    queue.add(async () => '🦄', {priority: 1});
    queue.add(async () => '🦀', {priority: 1, id: '🦀'});
    queue.add(async () => '🦄');
    queue.add(async () => '🦄', {priority: 0});

    queue.setPriority('🦀', -1);
    ```
    Here, the promise function with `id: '🦀'` executes last.
    */
    setPriority(id, priority) {
        if (typeof priority !== 'number' || !Number.isFinite(priority)) {
            throw new TypeError(`Expected \`priority\` to be a finite number, got \`${priority}\` (${typeof priority})`);
        }
        this.#queue.setPriority(id, priority);
    }
    async add(function_, options = {}) {
        // Create a copy to avoid mutating the original options object
        options = {
            timeout: this.timeout,
            ...options,
            // Assign unique ID if not provided
            id: options.id ?? (this.#idAssigner++).toString(),
        };
        return new Promise((resolve, reject) => {
            // Create a unique symbol for tracking this task
            const taskSymbol = Symbol(`task-${options.id}`);
            this.#queue.enqueue(async () => {
                this.#pending++;
                // Track this running task
                this.#runningTasks.set(taskSymbol, {
                    id: options.id,
                    priority: options.priority ?? 0, // Match priority-queue default
                    startTime: Date.now(),
                    timeout: options.timeout,
                });
                let eventListener;
                try {
                    // Check abort signal - if aborted, need to decrement the counter
                    // that was incremented in tryToStartAnother
                    try {
                        options.signal?.throwIfAborted();
                    }
                    catch (error) {
                        this.#rollbackIntervalConsumption();
                        // Clean up tracking before throwing
                        this.#runningTasks.delete(taskSymbol);
                        throw error;
                    }
                    this.#lastExecutionTime = Date.now();
                    let operation = function_({ signal: options.signal });
                    if (options.timeout) {
                        operation = pTimeout(Promise.resolve(operation), {
                            milliseconds: options.timeout,
                            message: `Task timed out after ${options.timeout}ms (queue has ${this.#pending} running, ${this.#queue.size} waiting)`,
                        });
                    }
                    if (options.signal) {
                        const { signal } = options;
                        operation = Promise.race([operation, new Promise((_resolve, reject) => {
                                eventListener = () => {
                                    reject(signal.reason);
                                };
                                signal.addEventListener('abort', eventListener, { once: true });
                            })]);
                    }
                    const result = await operation;
                    resolve(result);
                    this.emit('completed', result);
                }
                catch (error) {
                    reject(error);
                    this.emit('error', error);
                }
                finally {
                    // Clean up abort event listener
                    if (eventListener) {
                        options.signal?.removeEventListener('abort', eventListener);
                    }
                    // Remove from running tasks
                    this.#runningTasks.delete(taskSymbol);
                    // Use queueMicrotask to prevent deep recursion while maintaining timing
                    queueMicrotask(() => {
                        this.#next();
                    });
                }
            }, options);
            this.emit('add');
            this.#tryToStartAnother();
        });
    }
    async addAll(functions, options) {
        return Promise.all(functions.map(async (function_) => this.add(function_, options)));
    }
    /**
    Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
    */
    start() {
        if (!this.#isPaused) {
            return this;
        }
        this.#isPaused = false;
        this.#processQueue();
        return this;
    }
    /**
    Put queue execution on hold.
    */
    pause() {
        this.#isPaused = true;
    }
    /**
    Clear the queue.
    */
    clear() {
        this.#queue = new this.#queueClass();
        // Clear interval timer since queue is now empty (consistent with #tryToStartAnother)
        this.#clearIntervalTimer();
        // Note: We preserve strict mode rate-limiting state (ticks and timeout)
        // because clear() only clears queued tasks, not rate limit history.
        // This ensures that rate limits are still enforced after clearing the queue.
        // Note: We don't clear #runningTasks as those tasks are still running
        // They will be removed when they complete in the finally block
        // Force synchronous update since clear() should have immediate effect
        this.#updateRateLimitState();
        // Emit events so waiters (onEmpty, onIdle, onSizeLessThan) can resolve
        this.emit('empty');
        if (this.#pending === 0) {
            this.#clearTimeoutTimer();
            this.emit('idle');
        }
        this.emit('next');
    }
    /**
    Can be called multiple times. Useful if you for example add additional items at a later time.

    @returns A promise that settles when the queue becomes empty.
    */
    async onEmpty() {
        // Instantly resolve if the queue is empty
        if (this.#queue.size === 0) {
            return;
        }
        await this.#onEvent('empty');
    }
    /**
    @returns A promise that settles when the queue size is less than the given limit: `queue.size < limit`.

    If you want to avoid having the queue grow beyond a certain size you can `await queue.onSizeLessThan()` before adding a new item.

    Note that this only limits the number of items waiting to start. There could still be up to `concurrency` jobs already running that this call does not include in its calculation.
    */
    async onSizeLessThan(limit) {
        // Instantly resolve if the queue is empty.
        if (this.#queue.size < limit) {
            return;
        }
        await this.#onEvent('next', () => this.#queue.size < limit);
    }
    /**
    The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

    @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
    */
    async onIdle() {
        // Instantly resolve if none pending and if nothing else is queued
        if (this.#pending === 0 && this.#queue.size === 0) {
            return;
        }
        await this.#onEvent('idle');
    }
    /**
    The difference with `.onIdle` is that `.onPendingZero` only waits for currently running tasks to finish, ignoring queued tasks.

    @returns A promise that settles when all currently running tasks have completed; `queue.pending === 0`.
    */
    async onPendingZero() {
        if (this.#pending === 0) {
            return;
        }
        await this.#onEvent('pendingZero');
    }
    /**
    @returns A promise that settles when the queue becomes rate-limited due to intervalCap.
    */
    async onRateLimit() {
        if (this.isRateLimited) {
            return;
        }
        await this.#onEvent('rateLimit');
    }
    /**
    @returns A promise that settles when the queue is no longer rate-limited.
    */
    async onRateLimitCleared() {
        if (!this.isRateLimited) {
            return;
        }
        await this.#onEvent('rateLimitCleared');
    }
    /**
    @returns A promise that rejects when any task in the queue errors.

    Use with `Promise.race([queue.onError(), queue.onIdle()])` to fail fast on the first error while still resolving normally when the queue goes idle.

    Important: The promise returned by `add()` still rejects. You must handle each `add()` promise (for example, `.catch(() => {})`) to avoid unhandled rejections.

    @example
    ```
    import PQueue from 'p-queue';

    const queue = new PQueue({concurrency: 2});

    queue.add(() => fetchData(1)).catch(() => {});
    queue.add(() => fetchData(2)).catch(() => {});
    queue.add(() => fetchData(3)).catch(() => {});

    // Stop processing on first error
    try {
        await Promise.race([
            queue.onError(),
            queue.onIdle()
        ]);
    } catch (error) {
        queue.pause(); // Stop processing remaining tasks
        console.error('Queue failed:', error);
    }
    ```
    */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    onError() {
        return new Promise((_resolve, reject) => {
            const handleError = (error) => {
                this.off('error', handleError);
                reject(error);
            };
            this.on('error', handleError);
        });
    }
    async #onEvent(event, filter) {
        return new Promise(resolve => {
            const listener = () => {
                if (filter && !filter()) {
                    return;
                }
                this.off(event, listener);
                resolve();
            };
            this.on(event, listener);
        });
    }
    /**
    Size of the queue, the number of queued items waiting to run.
    */
    get size() {
        return this.#queue.size;
    }
    /**
    Size of the queue, filtered by the given options.

    For example, this can be used to find the number of items remaining in the queue with a specific priority level.
    */
    sizeBy(options) {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        return this.#queue.filter(options).length;
    }
    /**
    Number of running items (no longer in the queue).
    */
    get pending() {
        return this.#pending;
    }
    /**
    Whether the queue is currently paused.
    */
    get isPaused() {
        return this.#isPaused;
    }
    #setupRateLimitTracking() {
        // Only schedule updates when rate limiting is enabled
        if (this.#isIntervalIgnored) {
            return;
        }
        // Wire up to lifecycle events that affect rate limit state
        // Only 'add' and 'next' can actually change rate limit state
        this.on('add', () => {
            if (this.#queue.size > 0) {
                this.#scheduleRateLimitUpdate();
            }
        });
        this.on('next', () => {
            this.#scheduleRateLimitUpdate();
        });
    }
    #scheduleRateLimitUpdate() {
        // Skip if rate limiting is not enabled or already scheduled
        if (this.#isIntervalIgnored || this.#rateLimitFlushScheduled) {
            return;
        }
        this.#rateLimitFlushScheduled = true;
        queueMicrotask(() => {
            this.#rateLimitFlushScheduled = false;
            this.#updateRateLimitState();
        });
    }
    #rollbackIntervalConsumption() {
        if (this.#isIntervalIgnored) {
            return;
        }
        this.#rollbackIntervalSlot();
        this.#scheduleRateLimitUpdate();
    }
    #updateRateLimitState() {
        const previous = this.#rateLimitedInInterval;
        // Early exit if rate limiting is disabled or queue is empty
        if (this.#isIntervalIgnored || this.#queue.size === 0) {
            if (previous) {
                this.#rateLimitedInInterval = false;
                this.emit('rateLimitCleared');
            }
            return;
        }
        // Get the current count based on mode
        let count;
        if (this.#strict) {
            const now = Date.now();
            this.#cleanupStrictTicks(now);
            count = this.#getActiveTicksCount();
        }
        else {
            count = this.#intervalCount;
        }
        const shouldBeRateLimited = count >= this.#intervalCap;
        if (shouldBeRateLimited !== previous) {
            this.#rateLimitedInInterval = shouldBeRateLimited;
            this.emit(shouldBeRateLimited ? 'rateLimit' : 'rateLimitCleared');
        }
    }
    /**
    Whether the queue is currently rate-limited due to intervalCap.
    */
    get isRateLimited() {
        return this.#rateLimitedInInterval;
    }
    /**
    Whether the queue is saturated. Returns `true` when:
    - All concurrency slots are occupied and tasks are waiting, OR
    - The queue is rate-limited and tasks are waiting

    Useful for detecting backpressure and potential hanging tasks.

    ```js
    import PQueue from 'p-queue';

    const queue = new PQueue({concurrency: 2});

    // Backpressure handling
    if (queue.isSaturated) {
        console.log('Queue is saturated, waiting for capacity...');
        await queue.onSizeLessThan(queue.concurrency);
    }

    // Monitoring for stuck tasks
    setInterval(() => {
        if (queue.isSaturated) {
            console.warn(`Queue saturated: ${queue.pending} running, ${queue.size} waiting`);
        }
    }, 60000);
    ```
    */
    get isSaturated() {
        return (this.#pending === this.#concurrency && this.#queue.size > 0)
            || (this.isRateLimited && this.#queue.size > 0);
    }
    /**
    The tasks currently being executed. Each task includes its `id`, `priority`, `startTime`, and `timeout` (if set).

    Returns an array of task info objects.

    ```js
    import PQueue from 'p-queue';

    const queue = new PQueue({concurrency: 2});

    // Add tasks with IDs for better debugging
    queue.add(() => fetchUser(123), {id: 'user-123'});
    queue.add(() => fetchPosts(456), {id: 'posts-456', priority: 1});

    // Check what's running
    console.log(queue.runningTasks);
    // => [{
    //   id: 'user-123',
    //   priority: 0,
    //   startTime: 1759253001716,
    //   timeout: undefined
    // }, {
    //   id: 'posts-456',
    //   priority: 1,
    //   startTime: 1759253001916,
    //   timeout: undefined
    // }]
    ```
    */
    get runningTasks() {
        // Return fresh array with fresh objects to prevent mutations
        return [...this.#runningTasks.values()].map(task => ({ ...task }));
    }
}
/**
Error thrown when a task times out.

@example
```
import PQueue, {TimeoutError} from 'p-queue';

const queue = new PQueue({timeout: 1000});

try {
    await queue.add(() => someTask());
} catch (error) {
    if (error instanceof TimeoutError) {
        console.log('Task timed out');
    }
}
```
*/
export { TimeoutError } from 'p-timeout';
