export type ValueOf<a> = a extends readonly any[] ? a[number] : a[keyof a];
export type Values<a extends object> = UnionToTuple<ValueOf<a>>;
/**
 * ### LeastUpperBound
 * An interesting one. A type taking two imbricated sets and returning the
 * smallest one.
 * We need that because sometimes the pattern's inferred type holds more
 * information than the value on which we are matching (if the value is any
 * or unknown for instance).
 */
export type LeastUpperBound<a, b> = b extends a ? b : a extends b ? a : never;
export type Contains<a, b> = a extends any ? 'exclude' extends {
    [k in keyof a]-?: Equal<a[k], b> extends true ? 'exclude' : 'include';
}[keyof a] ? true : false : never;
export type UnionToIntersection<union> = (union extends any ? (k: union) => void : never) extends (k: infer intersection) => void ? intersection : never;
export type IsUnion<a> = [a] extends [UnionToIntersection<a>] ? false : true;
export type UnionToTuple<union, output extends any[] = []> = UnionToIntersection<union extends any ? (t: union) => union : never> extends (_: any) => infer elem ? UnionToTuple<Exclude<union, elem>, [elem, ...output]> : output;
export type Flatten<xs extends readonly any[], output extends any[] = []> = xs extends readonly [infer head, ...infer tail] ? Flatten<tail, [...output, ...Extract<head, readonly any[]>]> : output;
export type Equal<a, b> = (<T>() => T extends a ? 1 : 2) extends <T>() => T extends b ? 1 : 2 ? true : false;
export type Expect<a extends true> = a;
export type IsAny<a> = 0 extends 1 & a ? true : false;
export type IsNever<T> = [T] extends [never] ? true : false;
export type Length<it extends readonly any[]> = it['length'];
export type Iterator<n extends number, it extends any[] = []> = it['length'] extends n ? it : Iterator<n, [any, ...it]>;
export type Next<it extends any[]> = [any, ...it];
export type Prev<it extends any[]> = it extends readonly [any, ...infer tail] ? tail : [];
export type Take<xs extends readonly any[], it extends any[], output extends any[] = []> = Length<it> extends 0 ? output : xs extends readonly [infer head, ...infer tail] ? Take<tail, Prev<it>, [...output, head]> : output;
export type Drop<xs extends readonly any[], n extends any[]> = Length<n> extends 0 ? xs : xs extends readonly [any, ...infer tail] ? Drop<tail, Prev<n>> : [];
export type UpdateAt<tail extends readonly any[], n extends any[], value, inits extends readonly any[] = []> = Length<n> extends 0 ? tail extends readonly [any, ...infer tail] ? [...inits, value, ...tail] : inits : tail extends readonly [infer head, ...infer tail] ? UpdateAt<tail, Prev<n>, value, [...inits, head]> : inits;
export type BuiltInObjects = Function | Date | RegExp | Generator | {
    readonly [Symbol.toStringTag]: string;
} | any[];
export type IsPlainObject<o, excludeUnion = BuiltInObjects> = o extends object ? o extends string | excludeUnion ? false : true : false;
export type Compute<a extends any> = a extends BuiltInObjects ? a : {
    [k in keyof a]: a[k];
};
export type IntersectObjects<a> = (a extends any ? keyof a : never) extends infer allKeys ? {
    [k in Extract<allKeys, PropertyKey>]: a extends any ? k extends keyof a ? a[k] : never : never;
} : never;
export type WithDefault<a, def> = [a] extends [never] ? def : a;
export type IsLiteral<a> = [a] extends [null | undefined] ? true : [a] extends [string] ? string extends a ? false : true : [a] extends [number] ? number extends a ? false : true : [a] extends [boolean] ? boolean extends a ? false : true : [a] extends [symbol] ? symbol extends a ? false : true : [a] extends [bigint] ? bigint extends a ? false : true : false;
export type Primitives = number | boolean | string | undefined | null | symbol | bigint;
export type NonLiteralPrimitive = Exclude<Primitives, undefined | null>;
export type TupleKeys = '0' | '1' | '2' | '3' | '4';
export type Union<a, b> = [b] extends [a] ? a : [a] extends [b] ? b : a | b;
/**
 * GuardValue returns the value guarded by a type guard function.
 */
export type GuardValue<fn> = fn extends (value: any) => value is infer b ? b : fn extends (value: infer a) => unknown ? a : never;
export type GuardFunction<input, narrowed> = ((value: input) => value is Extract<narrowed, input>) | ((value: input) => boolean);
export type Some<bools extends boolean[]> = true extends bools[number] ? true : false;
export type All<bools extends boolean[]> = bools[number] extends true ? true : false;
export type Extends<a, b> = [a] extends [b] ? true : false;
export type Not<a extends boolean> = a extends true ? false : true;
type AllKeys<a> = a extends any ? keyof a : never;
export type MergeUnion<a> = {
    [k in AllKeys<a>]: a extends any ? k extends keyof a ? a[k] : never : never;
} | never;
export type IsFixedSizeTuple<a extends readonly any[]> = IsLiteral<Length<a>>;
export type IsTuple<a> = a extends readonly [] | readonly [any, ...any] | readonly [...any, any] ? true : false;
export type IsStrictArray<a extends readonly any[]> = Not<IsTuple<a>>;
export type IsReadonlyArray<a> = a extends readonly any[] ? a extends any[] ? false : true : false;
export type MaybeAddReadonly<a, shouldAdd extends boolean> = shouldAdd extends true ? Readonly<a> : a;
export type MapKey<T> = T extends Map<infer K, any> ? K : never;
export type MapValue<T> = T extends Map<any, infer V> ? V : never;
export type SetValue<T> = T extends Set<infer V> ? V : never;
export type ReadonlyArrayValue<T> = T extends ReadonlyArray<infer V> ? V : never;
export type ExtractPlainObject<T> = T extends any ? IsPlainObject<T> extends true ? T : never : never;
export type GetKey<O, K> = O extends any ? K extends keyof O ? O[K] : never : never;
export interface Fn {
    input: unknown;
    output: unknown;
}
export type Call<fn extends Fn, input> = (fn & {
    input: input;
})['output'];
export type IsOptionalKeysOf<obj, key extends keyof obj> = {} extends Pick<obj, key> ? true : false;
export {};
