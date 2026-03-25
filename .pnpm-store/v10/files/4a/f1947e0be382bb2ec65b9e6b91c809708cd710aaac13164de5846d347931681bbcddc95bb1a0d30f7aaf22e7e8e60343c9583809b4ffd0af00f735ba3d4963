import { IterationMap } from './Iteration';
/**
 * Transform a number into an [[Iteration]]
 * (to use [[Prev]], [[Next]], & [[Pos]])
 * @param N to transform
 * @returns [[Iteration]]
 * @example
 * ```ts
 * import {I} from 'ts-toolbelt'
 *
 * type i = I.IterationOf<0> // ["-1", "1", "0", 0, "0"]
 *
 * type next = I.Next<i>       // ["0", "2", "1", 1, "+"]
 * type prev = I.Prev<i>       // ["-2", "0", "-1", -1, "-"]
 *
 * type nnext = I.Pos<next>    // +1
 * type nprev = I.Pos<prev>    // -1
 * ```
 */
export declare type IterationOf<N extends number> = `${N}` extends keyof IterationMap ? IterationMap[`${N}`] : IterationMap['__'];
