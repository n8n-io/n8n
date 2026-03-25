import { Tail } from './Tail';
import { Cast } from '../Any/Cast';
import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Way } from '../Iteration/_Internal';
import { List } from './List';
import { Pos } from '../Iteration/Pos';
import { Prev } from '../Iteration/Prev';
import { Prepend } from './Prepend';
import { Naked } from './_Internal';
import { Extends } from '../Any/Extends';
/**
 * @hidden
 */
declare type DropForth<L extends List, N extends Iteration> = {
    0: DropForth<Tail<L>, Prev<N>>;
    1: L;
}[Extends<0, Pos<N>>];
/**
 * @hidden
 */
declare type DropBack<L extends List, N extends Iteration, I extends Iteration = Prev<N>, LN extends List = []> = {
    0: DropBack<L, N, Prev<I>, Prepend<LN, L[Pos<I>]>>;
    1: LN;
}[Extends<-1, Pos<I>>];
/**
 * @hidden
 */
declare type __Drop<L extends List, N extends Iteration, way extends Way> = {
    '->': DropForth<L, N>;
    '<-': DropBack<L, N>;
}[way];
/**
 * @hidden
 */
export declare type _Drop<L extends List, N extends number, way extends Way = '->'> = __Drop<Naked<L>, IterationOf<N>, way> extends infer X ? Cast<X, List> : never;
/**
 * Remove `N` entries out of `L`
 * @param L to remove from
 * @param N to remove out
 * @param way (?=`'->'`) from front: '->', from end: '<-'
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Drop<L extends List, N extends number, way extends Way = '->'> = L extends unknown ? N extends unknown ? _Drop<L, N, way> : never : never;
export {};
