import { Match } from '../Any/_Internal';
import { Is } from '../Any/Is';
/**
 * @hidden
 */
export declare type _FilterKeys<O extends object, M extends any, match extends Match> = {
    [K in keyof O]-?: {
        1: never;
        0: K;
    }[Is<O[K], M, match>];
}[keyof O];
/**
 * Filter out the keys of `O` which fields match `M`
 * @param O to remove from
 * @param M to select fields
 * @param match (?=`'default'`) to change precision
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type FilterKeys<O extends object, M extends any, match extends Match = 'default'> = O extends unknown ? _FilterKeys<O, M, match> : never;
