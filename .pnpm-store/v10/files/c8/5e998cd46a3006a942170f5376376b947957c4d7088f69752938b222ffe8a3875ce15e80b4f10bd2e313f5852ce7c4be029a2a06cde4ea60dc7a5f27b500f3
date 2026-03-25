import { List } from './List';
import { _UnNest } from './UnNest';
import { Cast } from '../Any/Cast';
import { Equals } from '../Any/Equals';
import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Extends } from '../Any/Extends';
import { Next } from '../Iteration/Next';
import { Or } from '../Boolean/Or';
import { Boolean } from '../Boolean/_Internal';
/**
 * @hidden
 */
declare type __Flatten<L extends List, LO extends List, strict extends Boolean, limit extends Iteration, I extends Iteration = IterationOf<0>> = {
    0: __Flatten<_UnNest<L, strict>, L, strict, limit, Next<I>>;
    1: L;
}[Or<Equals<L, LO>, Extends<limit, I>>];
/**
 * @hidden
 */
export declare type _Flatten<L extends List, strict extends Boolean, limit extends number = number> = __Flatten<L, [], strict, IterationOf<limit>> extends infer X ? Cast<X, List> : never;
/**
 * Remove all dimensions of `L` (10 max)
 * @param L to un-nest
 * @param strict (?=`1`) `0` to not preserve tuples
 * @param limit (?=`string`) to stop un-nesting at
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Flatten<L extends List, strict extends Boolean = 1, limit extends number = number> = L extends unknown ? _Flatten<L, strict, limit> : never;
export {};
