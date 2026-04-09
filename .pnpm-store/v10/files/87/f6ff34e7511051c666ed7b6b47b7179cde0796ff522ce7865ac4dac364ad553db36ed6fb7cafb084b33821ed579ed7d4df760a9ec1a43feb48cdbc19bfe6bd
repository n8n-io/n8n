/**
 * 字串大小寫轉換工具
 * String Case Conversion Utilities
 *
 * 提供字串命名字面量的大小寫轉換工具
 * Provides string naming literal case conversion utilities
 */
/**
 * 將連字符命名字符串轉換為 PascalCase
 * Convert kebab-case string literal to PascalCase
 *
 * @see yargs
 *
 * @example
 * type Result = ITSPascalCase<'foo-bar'>;
 * // type Result = "FooBar"
 *
 * @example
 * type Result = ITSPascalCase<'foo-bar-baz'>;
 * // type Result = "FooBarBaz"
 */
export type ITSPascalCase<S extends string> = string extends S ? string : S extends `${infer T}-${infer U}` ? `${Capitalize<T>}${ITSPascalCase<U>}` : Capitalize<S>;
/**
 * 將連字符命名字符串轉換為 camelCase
 * Convert kebab-case string literal to camelCase
 *
 * @see yargs
 *
 * @example
 * type Result = ITSCamelCase<'foo-bar'>;
 * // type Result = "fooBar"
 *
 * @example
 * type Result = ITSCamelCase<'foo-bar-baz'>;
 * // type Result = "fooBarBaz"
 */
export type ITSCamelCase<S extends string> = string extends S ? string : S extends `${infer T}-${infer U}` ? `${T}${ITSPascalCase<U>}` : S;
