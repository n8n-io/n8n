import { Primitives, IsPlainObject, IsUnion, ValueOf, Length, IsLiteral, All, Equal } from './helpers.js';
type IsMatchingTuple<a extends readonly any[], b extends readonly any[]> = [
    a,
    b
] extends [readonly [], readonly []] ? true : [a, b] extends [
    readonly [infer a1, ...infer aRest],
    readonly [infer b1, ...infer bRest]
] ? IsMatching<a1, b1> extends true ? IsMatchingTuple<aRest, bRest> : false : false;
type IsMatchingArray<a extends readonly any[], b extends readonly any[]> = b extends readonly [] ? true : b extends readonly [infer b1, ...infer bRest] ? a extends readonly [infer a1, ...infer aRest] ? IsMatching<a1, b1> extends true ? IsMatchingArray<aRest, bRest> : false : a extends readonly [] ? false : IsMatching<ValueOf<a>, b1> extends true ? IsMatchingArray<a, bRest> : false : b extends readonly [...infer bInit, infer b1] ? a extends readonly [...infer aInit, infer a1] ? IsMatching<a1, b1> extends true ? IsMatchingArray<aInit, bInit> : false : a extends readonly [] ? false : IsMatching<ValueOf<a>, b1> extends true ? IsMatchingArray<a, bInit> : false : IsMatching<ValueOf<a>, ValueOf<b>>;
export type IsMatching<a, b> = true extends IsUnion<a> | IsUnion<b> ? true extends (b extends any ? (a extends any ? IsMatching<a, b> : never) : never) ? true : false : unknown extends b ? true : {} extends b ? true : b extends Primitives ? a extends b ? true : b extends a ? true : false : Equal<a, b> extends true ? true : b extends readonly any[] ? a extends readonly any[] ? All<[IsLiteral<Length<a>>, IsLiteral<Length<b>>]> extends true ? Equal<Length<a>, Length<b>> extends false ? false : IsMatchingTuple<a, b> : IsMatchingArray<a, b> : false : IsPlainObject<b> extends true ? true extends (a extends any ? [keyof b & keyof a] extends [never] ? false : {
    [k in keyof b & keyof a]: IsMatching<a[k], b[k]>;
}[keyof b & keyof a] extends true ? true : false : never) ? true : false : b extends a ? true : false;
export {};
