import { Match } from '../Any/_Internal';
import { Is } from '../Any/Is';
/**
 * @hidden
 */
export declare type _SelectKeys<O extends object, M extends any, match extends Match> = {
    [K in keyof O]-?: {
        1: K;
        0: never;
    }[Is<O[K], M, match>];
}[keyof O];
/**
 * Get the keys of `O` which fields match `M`
 * @param O to extract from
 * @param M to select fields
 * @param match (?=`'default'`) to change precision
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type SelectKeys<O extends object, M extends any, match extends Match = 'default'> = O extends unknown ? _SelectKeys<O, M, match> : never;
