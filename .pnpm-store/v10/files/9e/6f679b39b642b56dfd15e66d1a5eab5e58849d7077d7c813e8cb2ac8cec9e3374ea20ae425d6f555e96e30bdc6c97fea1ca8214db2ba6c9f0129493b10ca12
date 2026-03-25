/**
 * @module
 * Types utility.
 */
export type Expect<T extends true> = T;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type RemoveBlankRecord<T> = T extends Record<infer K, unknown> ? (K extends string ? T : never) : never;
export type IfAnyThenEmptyObject<T> = 0 extends 1 & T ? {} : T;
export type JSONPrimitive = string | boolean | number | null;
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[];
export type JSONObject = {
    [key: string]: JSONPrimitive | JSONArray | JSONObject | object | InvalidJSONValue;
};
export type InvalidJSONValue = undefined | symbol | ((...args: unknown[]) => unknown);
type InvalidToNull<T> = T extends InvalidJSONValue ? null : T;
type IsInvalid<T> = T extends InvalidJSONValue ? true : false;
/**
 * symbol keys are omitted through `JSON.stringify`
 */
type OmitSymbolKeys<T> = {
    [K in keyof T as K extends symbol ? never : K]: T[K];
};
export type JSONValue = JSONObject | JSONArray | JSONPrimitive;
/**
 * Convert a type to a JSON-compatible type.
 *
 * Non-JSON values such as `Date` implement `.toJSON()`,
 * so they can be transformed to a value assignable to `JSONObject`
 *
 * `JSON.stringify()` throws a `TypeError` when it encounters a `bigint` value,
 * unless a custom `replacer` function or `.toJSON()` method is provided.
 *
 * This behaviour can be controlled by the `TError` generic type parameter,
 * which defaults to `bigint | ReadonlyArray<bigint>`.
 * You can set it to `never` to disable this check.
 */
export type JSONParsed<T, TError = bigint | ReadonlyArray<bigint>> = T extends {
    toJSON(): infer J;
} ? (() => J) extends () => JSONPrimitive ? J : (() => J) extends () => {
    toJSON(): unknown;
} ? {} : JSONParsed<J, TError> : T extends JSONPrimitive ? T : T extends InvalidJSONValue ? never : T extends ReadonlyArray<unknown> ? {
    [K in keyof T]: JSONParsed<InvalidToNull<T[K]>, TError>;
} : T extends Set<unknown> | Map<unknown, unknown> | Record<string, never> ? {} : T extends object ? T[keyof T] extends TError ? never : {
    [K in keyof OmitSymbolKeys<T> as IsInvalid<T[K]> extends true ? never : K]: boolean extends IsInvalid<T[K]> ? JSONParsed<T[K], TError> | undefined : JSONParsed<T[K], TError>;
} : T extends unknown ? T extends TError ? never : JSONValue : never;
/**
 * Useful to flatten the type output to improve type hints shown in editors. And also to transform an interface into a type to aide with assignability.
 * @copyright from sindresorhus/type-fest
 */
export type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
/**
 * A simple extension of Simplify that will deeply traverse array elements.
 */
export type SimplifyDeepArray<T> = T extends any[] ? {
    [E in keyof T]: SimplifyDeepArray<T[E]>;
} : Simplify<T>;
export type InterfaceToType<T> = T extends Function ? T : {
    [K in keyof T]: InterfaceToType<T[K]>;
};
export type RequiredKeysOf<BaseType extends object> = Exclude<{
    [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never;
}[keyof BaseType], undefined>;
export type HasRequiredKeys<BaseType extends object> = RequiredKeysOf<BaseType> extends never ? false : true;
export type IsAny<T> = boolean extends (T extends never ? true : false) ? true : false;
/**
 * String literal types with auto-completion
 * @see https://github.com/Microsoft/TypeScript/issues/29729
 */
export type StringLiteralUnion<T> = T | (string & Record<never, never>);
export {};
