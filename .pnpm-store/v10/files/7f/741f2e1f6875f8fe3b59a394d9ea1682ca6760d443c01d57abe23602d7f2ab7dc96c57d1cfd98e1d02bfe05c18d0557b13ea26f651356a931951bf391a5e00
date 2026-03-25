import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Prepend } from '../List/Prepend';
import { Prev } from '../Iteration/Prev';
import { Next } from '../Iteration/Next';
import { Cast } from '../Any/Cast';
import { Way } from '../Iteration/_Internal';
import { List } from '../List/List';
import { Extends } from '../Any/Extends';
import { Pos } from '../Iteration/Pos';
/**
 * @hidden
 */
declare type RangeForth<From extends Iteration, To extends Iteration, L extends List = []> = {
    0: RangeForth<Prev<From>, To, Prepend<L, Pos<From>>>;
    1: L;
}[Extends<From, To>];
/**
 * @hidden
 */
declare type RangeBack<From extends Iteration, To extends Iteration, L extends List = []> = {
    0: RangeBack<Next<From>, To, Prepend<L, Pos<From>>>;
    1: L;
}[Extends<From, To>];
/**
 * @hidden
 */
declare type __Range<From extends Iteration, To extends Iteration, way extends Way> = {
    '->': RangeForth<To, Prev<From>>;
    '<-': RangeBack<From, Next<To>>;
}[way];
/**
 * @hidden
 */
export declare type _Range<From extends number, To extends number, way extends Way> = __Range<IterationOf<From>, IterationOf<To>, way> extends infer X ? Cast<X, (string | number)[]> : never;
/**
 * Create a range of * *number**s
 * @param From to start with
 * @param To to end with
 * @param way (?=`'->'`) to reverse it
 * @returns `string[] | number[] | boolean[]`
 * @example
 * ```ts
 * import {N} from 'ts-toolbelt'
 *
 * type test0 = N.Range<'-2', '1'>            // ['-2', '-1', '0', '1']
 * type test1 = N.Range<'-2', '1', '->'>      // ['-2', '-1', '0', '1']
 * type test2 = N.Range<'-2', '1', '<-'>      // ['1', '0', '-1', '-2']
 * ```
 */
export declare type Range<From extends number, To extends number, way extends Way = '->'> = From extends unknown ? To extends unknown ? _Range<From, To, way> : never : never;
export {};
