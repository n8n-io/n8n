import { Concat } from './Concat';
import { Append } from './Append';
import { Cast } from '../Any/Cast';
import { Length } from './Length';
import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Next } from '../Iteration/Next';
import { Pos } from '../Iteration/Pos';
import { List } from './List';
import { UnionOf } from './UnionOf';
import { Naked } from './_Internal';
import { Extends } from '../Any/Extends';
import { Boolean } from '../Boolean/_Internal';
import { Not } from '../Boolean/Not';
import { And } from '../Boolean/And';
/**
 * @hidden
 */
declare type UnNestLoose<L extends List> = (UnionOf<L> extends infer UL ? UL extends unknown ? UL extends List ? UnionOf<UL> : UL : never : never)[] & {};
/**
 * @hidden
 */
declare type Flatter<L extends List, LN extends List, I extends Iteration> = L[Pos<I>] extends infer LP ? LP extends List ? Concat<LN, L[Pos<I>]> : Append<LN, L[Pos<I>]> : never;
/**
 * @hidden
 */
declare type UnNestStrict<L extends List, LN extends List = [], I extends Iteration = IterationOf<0>> = {
    0: UnNestStrict<L, Flatter<L, LN, I>, Next<I>>;
    1: LN;
}[Extends<Pos<I>, Length<L>>];
/**
 * @hidden
 */
declare type __UnNest<L extends List, strict extends Boolean> = {
    0: UnNestLoose<L>;
    1: UnNestStrict<L>;
}[And<Not<Extends<number, Length<L>>>, strict>];
/**
 * @hidden
 */
export declare type _UnNest<L extends List, strict extends Boolean> = __UnNest<Naked<L>, strict> extends infer X ? Cast<X, List> : never;
/**
 * Remove a dimension of `L`
 * @param L to un-nest
 * @param strict (?=`1`) `0` to not preserve tuples
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type UnNest<L extends List, strict extends Boolean = 1> = L extends unknown ? _UnNest<L, strict> : never;
export {};
