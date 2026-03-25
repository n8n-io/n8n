import { Iteration, IterationMap } from './Iteration';
/**
 * Move `I`'s position forward
 * @param I to move
 * @returns [[Iteration]]
 * @example
 * ```ts
 * import {I} from 'ts-toolbelt'
 *
 * type i = I.IterationOf<'20'>
 *
 * type test0 = I.Pos<i>         // 20
 * type test1 = I.Pos<I.Next<i>> // 21
 * ```
 */
export declare type Next<I extends Iteration> = IterationMap[I[3]];
