import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Merge } from './Merge';
import { Pos } from '../Iteration/Pos';
import { Next } from '../Iteration/Next';
import { Length } from '../List/Length';
import { Cast } from '../Any/Cast';
import { List } from '../List/List';
import { Extends } from '../Any/Extends';
import { Depth } from './_Internal';
import { BuiltIn } from '../Misc/BuiltIn';
/**
 * @hidden
 */
declare type __Assign<O extends object, Os extends List<object>, depth extends Depth, ignore extends object, fill extends any, I extends Iteration = IterationOf<0>> = {
    0: __Assign<Merge<Os[Pos<I>], O, depth, ignore, fill>, Os, depth, ignore, fill, Next<I>>;
    1: O;
}[Extends<Pos<I>, Length<Os>>];
/**
 * @hidden
 */
export declare type _Assign<O extends object, Os extends List<object>, depth extends Depth, ignore extends object, fill extends any> = __Assign<O, Os, depth, ignore, fill> extends infer X ? Cast<X, object> : never;
/**
 * Assign a list of [[Object]] into `O` with [[Merge]]. Merges from right to
 * left, first items get overridden by the next ones (last-in overrides).
 * @param O to assign to
 * @param Os to assign
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @param ignore (?=`BuiltIn`) types not to merge
 * @param fill (?=`undefined`) types of `O` to be replaced with ones of `O1`
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Assign<O extends object, Os extends List<object>, depth extends Depth = 'flat', ignore extends object = BuiltIn, fill extends any = undefined> = O extends unknown ? Os extends unknown ? _Assign<O, Os, depth, ignore, fill> : never : never;
export {};
