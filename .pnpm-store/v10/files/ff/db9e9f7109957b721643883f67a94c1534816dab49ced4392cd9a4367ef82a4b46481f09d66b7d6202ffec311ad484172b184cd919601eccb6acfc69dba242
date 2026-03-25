import { Equals } from '../Any/Equals';
/**
 * @hidden
 */
export declare type _WritableKeys<O extends object> = {
    [K in keyof O]-?: {
        1: K;
        0: never;
    }[Equals<{
        -readonly [Q in K]: O[K];
    }, {
        [Q in K]: O[K];
    }>];
}[keyof O];
/**
 * Get the keys of `O` that are writable
 * @param O
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type WritableKeys<O extends object> = O extends unknown ? _WritableKeys<O> : never;
