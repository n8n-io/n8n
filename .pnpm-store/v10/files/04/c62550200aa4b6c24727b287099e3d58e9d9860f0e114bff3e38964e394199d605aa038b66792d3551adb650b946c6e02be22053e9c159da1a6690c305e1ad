import { Equals } from '../Any/Equals';
/**
 * @hidden
 */
export declare type _ReadonlyKeys<O extends object> = {
    [K in keyof O]-?: {
        1: never;
        0: K;
    }[Equals<{
        -readonly [Q in K]: O[K];
    }, {
        [Q in K]: O[K];
    }>];
}[keyof O];
/**
 * Get the keys of `O` that are readonly
 * @param O
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type ReadonlyKeys<O extends object> = O extends unknown ? _ReadonlyKeys<O> : never;
