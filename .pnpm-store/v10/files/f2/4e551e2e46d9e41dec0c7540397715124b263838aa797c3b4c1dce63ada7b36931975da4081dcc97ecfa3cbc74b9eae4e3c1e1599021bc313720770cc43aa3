import { Queue, RunFunction } from './queue';
export interface QueueAddOptions {
    readonly [key: string]: unknown;
}
export interface Options<QueueType extends Queue<RunFunction, QueueOptions>, QueueOptions extends QueueAddOptions> {
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
    readonly carryoverConcurrencyCount?: boolean;
    /**
    Per-operation timeout in milliseconds. Operations fulfill once `timeout` elapses if they haven't already.
    */
    timeout?: number;
    /**
    Whether or not a timeout is considered an exception.

    @default false
    */
    throwOnTimeout?: boolean;
}
export interface DefaultAddOptions extends QueueAddOptions {
    /**
    Priority of operation. Operations with greater priority will be scheduled first.

    @default 0
    */
    readonly priority?: number;
}
