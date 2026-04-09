import { MetricAttributes } from '@opentelemetry/api';
import { InstrumentationScope } from '@opentelemetry/core';
export declare type Maybe<T> = T | undefined;
export declare function isNotNullish<T>(item: Maybe<T>): item is T;
/**
 * Converting the unordered attributes into unique identifier string.
 * @param attributes user provided unordered MetricAttributes.
 */
export declare function hashAttributes(attributes: MetricAttributes): string;
/**
 * Converting the instrumentation scope object to a unique identifier string.
 * @param instrumentationScope
 */
export declare function instrumentationScopeId(instrumentationScope: InstrumentationScope): string;
/**
 * Error that is thrown on timeouts.
 */
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Adds a timeout to a promise and rejects if the specified timeout has elapsed. Also rejects if the specified promise
 * rejects, and resolves if the specified promise resolves.
 *
 * <p> NOTE: this operation will continue even after it throws a {@link TimeoutError}.
 *
 * @param promise promise to use with timeout.
 * @param timeout the timeout in milliseconds until the returned promise is rejected.
 */
export declare function callWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T>;
export interface PromiseAllSettledFulfillResult<T> {
    status: 'fulfilled';
    value: T;
}
export interface PromiseAllSettledRejectionResult {
    status: 'rejected';
    reason: unknown;
}
export declare type PromiseAllSettledResult<T> = PromiseAllSettledFulfillResult<T> | PromiseAllSettledRejectionResult;
/**
 * Node.js v12.9 lower and browser compatible `Promise.allSettled`.
 */
export declare function PromiseAllSettled<T>(promises: Promise<T>[]): Promise<PromiseAllSettledResult<T>[]>;
export declare function isPromiseAllSettledRejectionResult(it: PromiseAllSettledResult<unknown>): it is PromiseAllSettledRejectionResult;
/**
 * Node.js v11.0 lower and browser compatible `Array.prototype.flatMap`.
 */
export declare function FlatMap<T, R>(arr: T[], fn: (it: T) => R[]): R[];
export declare function setEquals(lhs: Set<unknown>, rhs: Set<unknown>): boolean;
/**
 * Binary search the sorted array to the find upper bound for the value.
 * @param arr
 * @param value
 * @returns
 */
export declare function binarySearchUB(arr: number[], value: number): number;
export declare function equalsCaseInsensitive(lhs: string, rhs: string): boolean;
//# sourceMappingURL=utils.d.ts.map