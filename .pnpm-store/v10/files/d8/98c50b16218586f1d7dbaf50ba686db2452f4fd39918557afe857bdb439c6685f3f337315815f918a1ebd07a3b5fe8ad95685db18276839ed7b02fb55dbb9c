import { Is } from '../Any/Is';
import { Match } from '../Any/_Internal';
/**
 * Replace `M` with `A` in `U`
 * @param U to update
 * @param M to select
 * @param A to update with
 * @returns [[Union]]
 * @example
 * ```ts
 * ```
 */
export declare type Replace<U extends any, M extends any, A extends any, match extends Match = 'default'> = U extends unknown ? {
    1: A;
    0: U;
}[Is<U, M, match>] : never;
