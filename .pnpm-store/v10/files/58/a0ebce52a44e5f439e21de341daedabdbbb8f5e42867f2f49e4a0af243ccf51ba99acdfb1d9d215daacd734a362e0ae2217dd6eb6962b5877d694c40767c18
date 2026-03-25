import { type Queue, type RunFunction } from './queue.js';
type TimeoutOptions = {
    /**
    Per-operation timeout in milliseconds. Operations will throw a `TimeoutError` if they don't complete within the specified time.

    The timeout begins when the operation is dequeued and starts execution, not while it's waiting in the queue.

    @default undefined

    Can be overridden per task using the `timeout` option in `.add()`:

    @example
    ```
    const queue = new PQueue({timeout: 5000});

    // This task uses the global 5s timeout
    await queue.add(() => fetchData());

    // This task has a 10s timeout
    await queue.add(() => slowTask(), {timeout: 10000});
    ```
    */
    timeout?: number;
};
export type Options<QueueType extends Queue<RunFunction, QueueOptions>, QueueOptions extends QueueAddOptions> = {
    /**
    Concurrency limit.

    Minimum: `1`.

    @default Infinity
    */
    readonly concurrency?: number;
    /**
    Whether queue tasks within concurrency limit, are auto-executed as soon as they're added.

    @default true
    */
    readonly autoStart?: boolean;
    /**
    Class with a `enqueue` and `dequeue` method, and a `size` getter. See the [Custom QueueClass](https://github.com/sindresorhus/p-queue#custom-queueclass) section.
    */
    readonly queueClass?: new () => QueueType;
    /**
    The max number of runs in the given interval of time.

    Minimum: `1`.

    @default Infinity
    */
    readonly intervalCap?: number;
    /**
    The length of time in milliseconds before the interval count resets. Must be finite.

    Minimum: `0`.

    @default 0
    */
    readonly interval?: number;
    /**
    Whether the task must finish in the given interval or will be carried over into the next interval count.

    @default false
    */
    readonly carryoverIntervalCount?: boolean;
    /**
    @deprecated Renamed to `carryoverIntervalCount`.
    */
    readonly carryoverConcurrencyCount?: boolean;
    /**
    Whether to use strict mode for rate limiting (sliding window algorithm).

    When enabled, ensures that no more than `intervalCap` tasks execute in any rolling `interval` window, rather than resetting the count at fixed intervals. This provides more predictable and evenly distributed execution.

    @default false

    For example, with `intervalCap: 2` and `interval: 1000`:
    - __Default mode (fixed window)__: Tasks can burst at window boundaries. You could execute 2 tasks at 999ms and 2 more at 1000ms, resulting in 4 tasks within 1ms.
    - __Strict mode (sliding window)__: Enforces that no more than 2 tasks execute in any 1000ms rolling window, preventing bursts.

    Strict mode is more resource-intensive as it tracks individual execution timestamps. Use it when you need guaranteed rate-limit compliance, such as when interacting with APIs that enforce strict rate limits.

    The `carryoverIntervalCount` option has no effect when `strict` mode is enabled, as strict mode tracks actual execution timestamps rather than counting pending tasks.
    */
    readonly strict?: boolean;
} & TimeoutOptions;
export type QueueAddOptions = {
    /**
    Priority of operation. Operations with greater priority will be scheduled first.

    @default 0
    */
    readonly priority?: number;
    /**
    Unique identifier for the promise function, used to update its priority before execution. If not specified, it is auto-assigned an incrementing BigInt starting from `1n`.
    */
    id?: string;
} & TaskOptions & TimeoutOptions;
export type TaskOptions = {
    /**
    [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) for cancellation of the operation. When aborted, it will be removed from the queue and the `queue.add()` call will reject with an `AbortError`. If the operation is already running, the signal will need to be handled by the operation itself.

    @example
    ```
    import PQueue, {AbortError} from 'p-queue';
    import got, {CancelError} from 'got';

    const queue = new PQueue();

    const controller = new AbortController();

    try {
        await queue.add(({signal}) => {
            const request = got('https://sindresorhus.com');

            signal.addEventListener('abort', () => {
                request.cancel();
            });

            try {
                return await request;
            } catch (error) {
                if (!(error instanceof CancelError)) {
                    throw error;
                }
            }
        }, {signal: controller.signal});
    } catch (error) {
        if (!(error instanceof AbortError)) {
            throw error;
        }
    }
    ```
    */
    readonly signal?: AbortSignal | undefined;
};
export {};
