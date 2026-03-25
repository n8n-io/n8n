import { _Greater } from './Greater';
import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
/**
 * @hidden
 */
export declare type _Lower<N1 extends Iteration, N2 extends Iteration> = _Greater<N2, N1>;
/**
 * Check if a [[Number]] is lower than another one
 * @param N1 to compare
 * @param N2 to compare to
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {N} from 'ts-toolbelt'
 *
 * type test0 = N.Lower<'7', '5'> // False
 * type test1 = N.Lower<'5', '5'> // False
 * type test2 = N.Lower<'5', '7'> // True
 * ```
 */
export declare type Lower<N1 extends number, N2 extends number> = N1 extends unknown ? N2 extends unknown ? _Lower<IterationOf<N1>, IterationOf<N2>> : never : never;
