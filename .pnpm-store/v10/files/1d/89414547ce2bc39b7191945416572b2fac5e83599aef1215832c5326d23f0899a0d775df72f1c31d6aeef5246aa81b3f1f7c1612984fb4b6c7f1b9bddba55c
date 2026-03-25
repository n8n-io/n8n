import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Next } from '../Iteration/Next';
import { Length } from './Length';
import { Pos } from '../Iteration/Pos';
import { Cast } from '../Any/Cast';
import { List } from './List';
import { Naked } from './_Internal';
import { Extends } from '../Any/Extends';
import { Append } from './Append';
/**
 * @hidden
 */
declare type __Zip<L extends List, L1 extends List, LN extends List = [], I extends Iteration = IterationOf<0>> = {
    0: __Zip<L, L1, Append<LN, [L[Pos<I>], L1[Pos<I>]]>, Next<I>>;
    1: LN;
}[Extends<Pos<I>, Length<L>>];
/**
 * @hidden
 */
export declare type _Zip<L extends List, L1 extends List> = __Zip<Naked<L>, L1> extends infer X ? Cast<X, List> : never;
/**
 * Pair up the entries of `L` with `L1`
 * @param L to pair up
 * @param L1 to pair up with
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Zip<L extends List, L1 extends List> = L extends unknown ? L1 extends unknown ? _Zip<L, L1> : never : never;
export {};
