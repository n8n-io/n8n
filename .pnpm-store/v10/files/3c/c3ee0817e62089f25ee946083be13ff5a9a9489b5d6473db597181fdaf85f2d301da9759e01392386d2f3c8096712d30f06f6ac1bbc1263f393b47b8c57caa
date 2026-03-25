import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Pos } from '../Iteration/Pos';
import { Next } from '../Iteration/Next';
import { Length } from '../List/Length';
import { Cast } from '../Any/Cast';
import { List } from '../List/List';
import { Extends } from '../Any/Extends';
import { Depth } from './_Internal';
import { Patch } from './Patch';
import { BuiltIn } from '../Misc/BuiltIn';
/**
 * @hidden
 */
declare type __PatchAll<O extends object, Os extends List<object>, depth extends Depth, ignore extends object, fill extends any, I extends Iteration = IterationOf<0>> = {
    0: __PatchAll<Patch<O, Os[Pos<I>], depth, ignore, fill>, Os, depth, ignore, fill, Next<I>>;
    1: O;
}[Extends<Pos<I>, Length<Os>>];
/**
 * @hidden
 */
export declare type _PatchAll<O extends object, Os extends List<object>, depth extends Depth, ignore extends object, fill extends any> = __PatchAll<O, Os, depth, ignore, fill> extends infer X ? Cast<X, object> : never;
/**
 * [[Patch]] a list of [[Object]]s into `O`. Patches from left to right, first
 * items get completed by the next ones (last-in completes).
 * @param O to start with
 * @param Os to patch
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @param ignore (?=`BuiltIn`) types not to merge
 * @param fill (?=`never`) types of `O` to be replaced with ones of `O1`
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type PatchAll<O extends object, Os extends List<object>, depth extends Depth = 'flat', ignore extends object = BuiltIn, fill extends any = never> = O extends unknown ? Os extends unknown ? _PatchAll<O, Os, depth, ignore, fill> : never : never;
export {};
