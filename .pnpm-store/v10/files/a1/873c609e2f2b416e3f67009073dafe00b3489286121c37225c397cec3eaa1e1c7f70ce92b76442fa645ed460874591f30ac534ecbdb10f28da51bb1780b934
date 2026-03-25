import { Clock, Time } from "./clock";
export interface Retry<T, U> {
    retryUntil(fn: () => Promise<T>, predicate: (result: T) => boolean | Promise<boolean>, onTimeout: () => U, timeoutMs: number): Promise<T | U>;
}
declare abstract class AbstractRetry<T, U> implements Retry<T, U> {
    protected readonly clock: Clock;
    protected constructor(clock?: Clock);
    abstract retryUntil(fn: () => Promise<T>, predicate: (result: T) => boolean | Promise<boolean>, onTimeout: () => U, timeoutMs: number): Promise<T | U>;
    protected hasTimedOut(timeoutMs: number, startTime: Time): boolean;
    protected wait(duration: number): Promise<void>;
}
export declare class IntervalRetry<T, U> extends AbstractRetry<T, U> {
    private readonly interval;
    constructor(interval: number);
    retryUntil(fn: (attempt: number) => Promise<T>, predicate: (result: T) => boolean | Promise<boolean>, onTimeout: () => U, timeoutMs: number): Promise<T | U>;
}
export {};
