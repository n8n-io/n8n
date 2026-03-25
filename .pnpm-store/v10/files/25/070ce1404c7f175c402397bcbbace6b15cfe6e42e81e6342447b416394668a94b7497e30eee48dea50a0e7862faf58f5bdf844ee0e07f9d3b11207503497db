import { Next } from '../Iteration/Next';
import { Prepend } from './Prepend';
import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Cast } from '../Any/Cast';
import { List } from './List';
import { Extends } from '../Any/Extends';
import { Pos } from '../Iteration/Pos';
/**
 * @hidden
 */
declare type __Repeat<N extends number, A, L extends List = [], I extends Iteration = IterationOf<0>> = {
    0: __Repeat<N, A, Prepend<L, A>, Next<I>>;
    1: L;
}[Extends<Pos<I>, N>];
/**
 * @hidden
 */
export declare type _Repeat<A extends any, N extends number, L extends List = []> = __Repeat<N, A, L> extends infer X ? Cast<X, List> : never;
/**
 * Fill a [[List]] with `N` times `A`
 * @param A to fill with
 * @param N to repeat it
 * @param L (?=`[]`) to be filled
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Repeat<A extends any, N extends number, L extends List = []> = N extends unknown ? L extends unknown ? _Repeat<A, N, L> : never : never;
export {};
