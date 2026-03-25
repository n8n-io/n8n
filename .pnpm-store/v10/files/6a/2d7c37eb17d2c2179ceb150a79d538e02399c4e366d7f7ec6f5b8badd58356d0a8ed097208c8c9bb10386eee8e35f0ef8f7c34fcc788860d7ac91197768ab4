import { EventEmitter } from 'eventemitter3';
import { type Queue, type RunFunction } from './queue.js';
import PriorityQueue from './priority-queue.js';
import { type QueueAddOptions, type Options, type TaskOptions } from './options.js';
type Task<TaskResultType> = ((options: TaskOptions) => PromiseLike<TaskResultType>) | ((options: TaskOptions) => TaskResultType);
type EventName = 'active' | 'idle' | 'empty' | 'add' | 'next' | 'completed' | 'error' | 'pendingZero' | 'rateLimit' | 'rateLimitCleared';
/**
Promise queue with concurrency control.
*/
export default class PQueue<QueueType extends Queue<RunFunction, EnqueueOptionsType> = PriorityQueue, EnqueueOptionsType extends QueueAddOptions = QueueAddOptions> extends EventEmitter<EventName> {
    #private;
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
    timeout?: number;
    constructor(options?: Options<QueueType, EnqueueOptionsType>);
    get concurrency(): number;
    set concurrency(newConcurrency: number);
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
    setPriority(id: string, priority: number): void;
    /**
    Adds a sync or async task to the queue. Always returns a promise.
    */
    add<TaskResultType>(function_: Task<TaskResultType>, options?: Partial<EnqueueOptionsType>): Promise<TaskResultType>;
    /**
    Same as `.add()`, but accepts an array of sync or async functions.

    @returns A promise that resolves when all functions are resolved.
    */
    addAll<TaskResultsType>(functions: ReadonlyArray<Task<TaskResultsType>>, options?: Partial<EnqueueOptionsType>): Promise<TaskResultsType[]>;
    /**
    Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
    */
    start(): this;
    /**
    Put queue execution on hold.
    */
    pause(): void;
    /**
    Clear the queue.
    */
    clear(): void;
    /**
    Can be called multiple times. Useful if you for example add additional items at a later time.

    @returns A promise that settles when the queue becomes empty.
    */
    onEmpty(): Promise<void>;
    /**
    @returns A promise that settles when the queue size is less than the given limit: `queue.size < limit`.

    If you want to avoid having the queue grow beyond a certain size you can `await queue.onSizeLessThan()` before adding a new item.

    Note that this only limits the number of items waiting to start. There could still be up to `concurrency` jobs already running that this call does not include in its calculation.
    */
    onSizeLessThan(limit: number): Promise<void>;
    /**
    The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

    @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
    */
    onIdle(): Promise<void>;
    /**
    The difference with `.onIdle` is that `.onPendingZero` only waits for currently running tasks to finish, ignoring queued tasks.

    @returns A promise that settles when all currently running tasks have completed; `queue.pending === 0`.
    */
    onPendingZero(): Promise<void>;
    /**
    @returns A promise that settles when the queue becomes rate-limited due to intervalCap.
    */
    onRateLimit(): Promise<void>;
    /**
    @returns A promise that settles when the queue is no longer rate-limited.
    */
    onRateLimitCleared(): Promise<void>;
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
    onError(): Promise<never>;
    /**
    Size of the queue, the number of queued items waiting to run.
    */
    get size(): number;
    /**
    Size of the queue, filtered by the given options.

    For example, this can be used to find the number of items remaining in the queue with a specific priority level.
    */
    sizeBy(options: Readonly<Partial<EnqueueOptionsType>>): number;
    /**
    Number of running items (no longer in the queue).
    */
    get pending(): number;
    /**
    Whether the queue is currently paused.
    */
    get isPaused(): boolean;
    /**
    Whether the queue is currently rate-limited due to intervalCap.
    */
    get isRateLimited(): boolean;
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
    get isSaturated(): boolean;
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
    get runningTasks(): ReadonlyArray<{
        readonly id?: string;
        readonly priority: number;
        readonly startTime: number;
        readonly timeout?: number;
    }>;
}
export type { Queue } from './queue.js';
export { type QueueAddOptions, type Options } from './options.js';
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
