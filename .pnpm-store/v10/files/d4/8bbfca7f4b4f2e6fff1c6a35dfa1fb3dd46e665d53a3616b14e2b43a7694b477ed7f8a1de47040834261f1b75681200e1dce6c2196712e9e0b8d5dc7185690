/**
 * pLimit creates a "limiter" function that can be used to enqueue
 * promise returning functions with limited concurrency.
 * @param {number} concurrency
 */
export function pLimit(concurrency: number): <Arguments extends unknown[], RType>(fn: (...args: Arguments) => RType | PromiseLike<RType>, ...args: Arguments) => Promise<RType>;
