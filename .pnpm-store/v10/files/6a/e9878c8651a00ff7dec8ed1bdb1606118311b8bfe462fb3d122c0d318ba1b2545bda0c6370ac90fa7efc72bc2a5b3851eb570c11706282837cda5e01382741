/**
 * 內部字串字面量邏輯工具（內部使用）
 * Internal String Literal Logic Utilities (Internal Use)
 *
 * 提供內部使用的字串字面量邏輯判斷工具
 * Provides internal string literal logic detection utilities
 */
/**
 * 檢測 T 是否為聯合類型（內部使用）
 * Detect if T is a union type (internal use)
 *
 * @internal
 *
 * @example
 * type Test1 = IsAUnion<'a' | 'b'>;
 * // type Test1 = true
 *
 * @example
 * type Test2 = IsAUnion<'a'>;
 * // type Test2 = false
 */
export type IsAUnion<T, Y = true, N = false, U = T> = U extends any ? ([T] extends [U] ? N : Y) : never;
/**
 * 檢測 T 是否為單一字串字面量（內部使用）
 * Detect if T is a single string literal (internal use)
 *
 * @internal
 *
 * @example
 * type Test1 = IsASingleStringLiteral<'hello'>;
 * // type Test1 = true
 *
 * @example
 * type Test2 = IsASingleStringLiteral<'a' | 'b'>;
 * // type Test2 = false
 *
 * @example
 * type Test3 = IsASingleStringLiteral<string>;
 * // type Test3 = false
 */
export type IsASingleStringLiteral<T extends string, Y = true, N = false> = string extends T ? N : [T] extends [never] ? N : IsAUnion<T, N, Y>;
