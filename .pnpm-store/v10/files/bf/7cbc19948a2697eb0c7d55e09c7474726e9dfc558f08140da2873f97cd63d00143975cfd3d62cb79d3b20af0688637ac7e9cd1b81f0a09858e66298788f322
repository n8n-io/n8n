import { Cast } from '../Any/Cast';
import { List } from '../List/List';
import { Extends } from '../Any/Extends';
import { Select } from '../Union/Select';
import { Exclude } from '../Union/Exclude';
import { Iteration } from '../Iteration/Iteration';
import { IterationOf } from '../Iteration/IterationOf';
import { Pos } from '../Iteration/Pos';
import { Key } from '../Iteration/Key';
import { Append } from '../List/Append';
import { Next } from '../Iteration/Next';
/**
 * @hidden
 */
declare type AppendExists<O extends object, LN extends List, I extends Iteration> = Key<I> extends keyof O ? Append<LN, O[Key<I>]> : Pos<I> extends keyof O ? Append<LN, O[Pos<I>]> : LN;
/**
 * @hidden
 */
declare type ___ListOf<O extends object, K, LN extends List = [], I extends Iteration = IterationOf<0>> = {
    0: ___ListOf<O, Exclude<K, Key<I>>, AppendExists<O, LN, I>, Next<I>>;
    1: LN;
}[Extends<[K], [never]>];
/**
 * @hidden
 */
declare type __ListOf<O extends object> = number extends keyof O ? O[number][] : string extends keyof O ? O[string][] : symbol extends keyof O ? O[symbol][] : ___ListOf<O, Select<keyof O, number | `${number}`>>;
/**
 * @hidden
 */
export declare type _ListOf<O extends object> = __ListOf<O> extends infer X ? Cast<X, List> : never;
/**
 * Transform an [[Object]] into a [[List]]
 * (It will only pick numeric literal indexes)
 * @param O to transform
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type ListOf<O extends object> = O extends unknown ? _ListOf<O> : never;
export {};
