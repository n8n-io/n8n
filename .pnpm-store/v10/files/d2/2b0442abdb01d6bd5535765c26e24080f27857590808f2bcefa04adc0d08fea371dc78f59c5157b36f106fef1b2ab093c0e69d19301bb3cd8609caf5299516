export declare const THROTTLED = "__THROTTLED";
export declare const SKIPPED = "__SKIPPED";
/**
 * Create a throttled function off a given function.
 * When calling the throttled function, it will call the original function only
 * if it hasn't been called more than `maxCount` times in the last `durationSeconds`.
 *
 * Returns `THROTTLED` if throttled for the first time, after that `SKIPPED`,
 * or else the return value of the original function.
 */
export declare function throttle<T extends (...rest: any[]) => any>(fn: T, maxCount: number, durationSeconds: number): (...rest: Parameters<T>) => ReturnType<T> | typeof THROTTLED | typeof SKIPPED;
//# sourceMappingURL=throttle.d.ts.map