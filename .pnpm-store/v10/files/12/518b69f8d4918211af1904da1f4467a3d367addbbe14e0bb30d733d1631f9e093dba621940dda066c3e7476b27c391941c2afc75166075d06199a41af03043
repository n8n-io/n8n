import { Match } from '../Any/_Internal';
import { Is } from '../Any/Is';
/**
 * @hidden
 */
export declare type _Replace<O extends object, M extends any, A extends any, match extends Match> = {
    [K in keyof O]: {
        1: A;
        0: O[K];
    }[Is<M, O[K], match>];
} & {};
/**
 * Update with `A` the fields of `O` that match `M`
 * @param O to update
 * @param M to select fields
 * @param A to update with
 * @param match (?=`'default'`) to change precision
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Replace<O extends object, M extends any, A extends any, match extends Match = 'default'> = O extends unknown ? _Replace<O, M, A, match> : never;
