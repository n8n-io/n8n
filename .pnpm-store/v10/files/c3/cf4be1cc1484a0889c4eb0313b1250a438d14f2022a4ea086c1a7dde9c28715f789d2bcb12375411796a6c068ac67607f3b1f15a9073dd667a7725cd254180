import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
/**
 * @hidden
 */
export declare type _IsNegative<N extends Iteration> = {
    '-': 1;
    '+': 0;
    '0': 0;
}[N[1]];
/**
 * Check whether a [[Number]] is negative or not
 * @param N to check
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {N} from 'ts-toolbelt'
 *
 * type test0 = N.IsNegative<'0'>  // False
 * type test1 = N.IsNegative<'-7'> // True
 * type test2 = N.IsNegative<'7'>  // False
 * ```
 */
export declare type IsNegative<N extends number> = _IsNegative<IterationOf<N>>;
