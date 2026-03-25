import { Prepend } from './Prepend';
import { Pos } from '../Iteration/Pos';
import { Next } from '../Iteration/Next';
import { Length } from './Length';
import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Cast } from '../Any/Cast';
import { List } from './List';
import { Naked } from './_Internal';
import { Extends } from '../Any/Extends';
/**
 * @hidden
 */
declare type __Reverse<L extends List, LO extends List, I extends Iteration = IterationOf<0>> = {
    0: __Reverse<L, Prepend<LO, L[Pos<I>]>, Next<I>>;
    1: LO;
}[Extends<Pos<I>, Length<L>>];
/**
 * @hidden
 */
export declare type _Reverse<L extends List, LO extends List = []> = __Reverse<Naked<L>, LO> extends infer X ? Cast<X, List> : never;
/**
 * Turn a [[List]] the other way around
 * @param L to reverse
 * @param LO (?=`[]`) to prepend to
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Reverse<L extends List> = L extends unknown ? _Reverse<L> : never;
export {};
