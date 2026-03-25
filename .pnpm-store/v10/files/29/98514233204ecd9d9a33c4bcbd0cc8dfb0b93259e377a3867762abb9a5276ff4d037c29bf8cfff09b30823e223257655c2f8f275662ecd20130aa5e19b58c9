import { Match } from '../Any/_Internal';
import { UnionOf } from '../Object/UnionOf';
import { Next } from '../Iteration/Next';
import { Prev } from '../Iteration/Prev';
import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Is } from '../Any/Is';
import { Boolean } from '../Boolean/_Internal';
import { Cast } from '../Any/Cast';
import { Pos } from '../Iteration/Pos';
/**
 * @hidden
 */
declare type _IncludesDeep<O, M extends any, match extends Match, limit extends number, I extends Iteration = IterationOf<0>> = {
    0: _IncludesDeep<O extends object ? UnionOf<O> : O, M, match, limit, Next<I>>;
    1: 1;
    2: 0;
}[Pos<Prev<I>> extends limit ? 2 : Is<O, M, match>];
/**
 * Check whether `O`, or its sub-objects have fields that match `M`
 * where the maximum allowed depth is set with `limit`.
 *
 * @param O to be inspected
 * @param M to check field type
 * @param match (?=`'default'`) to change precision
 * @param limit (?=`'10'`) to change the check depth
 * @returns [[Boolean]]
 * @example
 * ```ts
 * ```
 * @author millsp, ctrlplusb
 */
export declare type IncludesDeep<O extends object, M extends any, match extends Match = 'default', limit extends number = 10> = _IncludesDeep<O, M, match, limit> extends infer X ? Cast<X, Boolean> : never;
export {};
