import { _Drop } from './Drop';
import { _Take } from './Take';
import { Cast } from '../Any/Cast';
import { Append } from './Append';
import { List } from './List';
import { Extends } from '../Any/Extends';
/**
 * @hidden
 */
declare type __Group<L extends List, N extends number, LN extends List = []> = {
    0: __Group<_Drop<L, N>, N, Append<LN, _Take<L, N>>>;
    1: LN;
}[Extends<L, List<never>>];
/**
 * @hidden
 */
export declare type _Group<L extends List, N extends number> = __Group<L, N> extends infer X ? Cast<X, List> : never;
/**
 * Split `L` into sub-[[List]]s every `N`
 * @param L to group
 * @param N to split at
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Group<L extends List, N extends number> = L extends unknown ? N extends unknown ? _Group<L, N> : never : never;
export {};
