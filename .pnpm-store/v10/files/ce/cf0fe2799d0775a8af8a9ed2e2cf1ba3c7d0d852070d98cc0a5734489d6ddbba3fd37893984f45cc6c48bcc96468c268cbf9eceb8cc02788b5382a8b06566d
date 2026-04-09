/**
 * 字面量類型工具
 * Literal Type Utilities
 *
 * 提供字串、數字、布林值轉換為字面量類型的工具
 * Provides utilities for converting strings, numbers, booleans to literal types
 */
/** 允許轉換為字面量類型的基礎類型 / Base types allowed to convert to literal types */
export type ITSToStringLiteralAllowedType = string | number | boolean | bigint;
/**
 * 將類型轉換為字面量類型 `${T}`
 * Convert type to literal type `${T}`
 *
 * @example
 * type Str = ITSToStringLiteral<'hello'>;
 * // type Str = "hello"
 *
 * @example
 * type Num = ITSToStringLiteral<42>;
 * // type Num = "42"
 */
export type ITSToStringLiteral<T extends ITSToStringLiteralAllowedType> = `${T}`;
/**
 * 原始類型與其字面量類型的聯合
 * Union of original type and its literal type
 *
 * T & `${T}`
 *
 * 適合用在 enum 或 string literal union，可以接受 enum 的字面量或基底類型
 * Suitable for enum or string literal union, can accept enum literal or base type
 *
 * @example
 * // 應用於 string literal union
 * type Status = 'active' | 'inactive' | 'pending';
 * type IStatus = ITSTypeAndStringLiteral<Status>;
 * // type IStatus = "active" | "inactive" | "pending" | string
 *
 * @example
 * // 應用於 enum
 * enum EnumPackageManager {
 *   'yarn' = 'yarn',
 *   'npm' = 'npm',
 *   'pnpm' = 'pnpm',
 * }
 * type IPackageManager = ITSTypeAndStringLiteral<EnumPackageManager>;
 * // type IPackageManager = EnumPackageManager | string
 *
 * @example
 * // 應用於 number，可接受數字或數字字串
 * type INumber = ITSTypeAndStringLiteral<number>;
 * // type INumber = number | `${number}`
 */
export type ITSTypeAndStringLiteral<T extends ITSToStringLiteralAllowedType> = T | ITSToStringLiteral<T>;
/**
 * 原始類型 S 與 T 的字面量類型的聯合
 * Union of original type S and literal type of T
 *
 * S & `${T}`
 *
 * @example
 * type Result = ITSAndStringLiteral<1 | 2 | 3, number>;
 * // type Result = number | "1" | "2" | "3"
 */
export type ITSAndStringLiteral<T extends ITSToStringLiteralAllowedType, S = string> = S | ITSToStringLiteral<T>;
/**
 * 原始類型 S、T 與 T 的字面量類型的聯合
 * Union of original types S, T and literal type of T
 *
 * S & T & `${T}`
 *
 * @example
 * type Result = ITSAndTypeAndStringLiteral<1 | 2 | 3, number>;
 * // type Result = number | "1" | "2" | "3"
 */
export type ITSAndTypeAndStringLiteral<T extends ITSToStringLiteralAllowedType, S = string> = S | ITSTypeAndStringLiteral<T>;
