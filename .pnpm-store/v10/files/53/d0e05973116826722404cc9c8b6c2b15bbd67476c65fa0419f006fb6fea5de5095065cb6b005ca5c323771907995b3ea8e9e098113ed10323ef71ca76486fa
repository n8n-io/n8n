import { BuildMany } from './BuildMany.cjs';
import type { IsAny, Values, Flatten, IsUnion, IsPlainObject, Length, UnionToTuple, IsReadonlyArray, ValueOf, MaybeAddReadonly, IsStrictArray } from './helpers.cjs';
import { IsMatching } from './IsMatching.cjs';
/**
 * DistributeMatchingUnions takes two arguments:
 * - a data structure of type `a` containing unions
 * - a pattern `p`, matching this data structure
 * and turns it into a union of all possible
 * combination of each unions contained in `a` that matches `p`.
 *
 * It does this in 3 main steps:
 *  - 1. Find all unions contained in the data structure, that matches `p`
 *    with `FindUnions<a, p>`. It returns a tree of [union, path] pairs.
 *  - 2. this tree is passed to the `Distribute` type level function,
 *    Which turns it into a union of list of `[singleValue, path]` pairs.
 *    Each list correspond to one of the possible combination of the unions
 *    found in `a`.
 *  - 3. build a data structure with the same shape as `a` for each combination
 *    and return the union of these data structures.
 *
 * @example
 * type t1 = DistributeMatchingUnions<['a' | 'b', 1 | 2], ['a', 1]>;
 * // => ['a', 1] | ['a', 2] | ['b', 1] | ['b', 2]
 *
 * type t2 = DistributeMatchingUnions<['a' | 'b', 1 | 2], ['a', unknown]>;
 * // => ['a', 1 | 2] | ['b', 1 | 2]
 */
export type DistributeMatchingUnions<a, p> = IsAny<a> extends true ? any : BuildMany<a, Distribute<FindUnionsMany<a, p>>>;
export type FindUnionsMany<a, p, path extends PropertyKey[] = []> = UnionToTuple<(p extends any ? IsMatching<a, p> extends true ? FindUnions<a, p, path> : [] : never) extends readonly (infer T)[] ? T : never>;
/**
 * The reason we don't look further down the tree with lists,
 * Set and Maps is that they can be heterogeneous,
 * so matching on a A[] for a in input of (A|B)[]
 * doesn't rule anything out. You can still have
 * a (A|B)[] afterward. The same logic goes for Set and Maps.
 *
 * Kinds are types of types.
 *
 * kind UnionConfig = {
 *  cases: Union<{
 *    value: b,
 *    subUnions: UnionConfig[]
 *  }>,
 *  path: string[]
 * }
 * FindUnions :: Pattern a p => a -> p -> UnionConfig[]
 */
export type FindUnions<a, p, path extends PropertyKey[] = []> = unknown extends p ? [] : IsAny<p> extends true ? [] : Length<path> extends 5 ? [] : IsUnion<a> extends true ? [
    {
        cases: a extends any ? {
            value: a;
            subUnions: FindUnionsMany<a, p, path>;
        } : never;
        path: path;
    }
] : [a, p] extends [readonly any[], readonly any[]] ? [a, p] extends [
    readonly [infer a1, infer a2, infer a3, infer a4, infer a5],
    readonly [infer p1, infer p2, infer p3, infer p4, infer p5]
] ? [
    ...FindUnions<a1, p1, [...path, 0]>,
    ...FindUnions<a2, p2, [...path, 1]>,
    ...FindUnions<a3, p3, [...path, 2]>,
    ...FindUnions<a4, p4, [...path, 3]>,
    ...FindUnions<a5, p5, [...path, 4]>
] : [a, p] extends [
    readonly [infer a1, infer a2, infer a3, infer a4],
    readonly [infer p1, infer p2, infer p3, infer p4]
] ? [
    ...FindUnions<a1, p1, [...path, 0]>,
    ...FindUnions<a2, p2, [...path, 1]>,
    ...FindUnions<a3, p3, [...path, 2]>,
    ...FindUnions<a4, p4, [...path, 3]>
] : [a, p] extends [
    readonly [infer a1, infer a2, infer a3],
    readonly [infer p1, infer p2, infer p3]
] ? [
    ...FindUnions<a1, p1, [...path, 0]>,
    ...FindUnions<a2, p2, [...path, 1]>,
    ...FindUnions<a3, p3, [...path, 2]>
] : [a, p] extends [
    readonly [infer a1, infer a2],
    readonly [infer p1, infer p2]
] ? [...FindUnions<a1, p1, [...path, 0]>, ...FindUnions<a2, p2, [...path, 1]>] : [a, p] extends [readonly [infer a1], readonly [infer p1]] ? FindUnions<a1, p1, [...path, 0]> : p extends readonly [] | readonly [any, ...any] | readonly [...any, any] ? IsStrictArray<Extract<a, readonly any[]>> extends false ? [] : [
    ArrayToVariadicUnion<a, p> extends infer aUnion ? {
        cases: aUnion extends any ? {
            value: aUnion;
            subUnions: [];
        } : never;
        path: path;
    } : never
] : [] : a extends Set<any> ? [] : a extends Map<any, any> ? [] : [IsPlainObject<a>, IsPlainObject<p>] extends [true, true] ? Flatten<Values<{
    [k in keyof a & keyof p]: FindUnions<a[k], p[k], [...path, k]>;
}>> : [];
export type ArrayToVariadicUnion<input, excluded> = MaybeAddReadonly<(input extends readonly [any, ...any] | readonly [...any, any] ? never : []) | (excluded extends readonly [...any, any] ? [...Extract<input, readonly any[]>, ValueOf<input>] : [ValueOf<input>, ...Extract<input, readonly any[]>]), IsReadonlyArray<input>>;
export type Distribute<unions extends readonly any[]> = unions extends readonly [
    {
        cases: infer cases;
        path: infer path;
    },
    ...infer tail
] ? cases extends {
    value: infer value;
    subUnions: infer subUnions;
} ? [
    [
        value,
        path
    ],
    ...Distribute<Extract<subUnions, readonly any[]>>,
    ...Distribute<tail>
] : never : [];
