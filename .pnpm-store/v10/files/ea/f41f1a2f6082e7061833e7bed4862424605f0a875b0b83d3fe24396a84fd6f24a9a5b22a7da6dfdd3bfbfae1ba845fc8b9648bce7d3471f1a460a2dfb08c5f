/**
 * 字串操作工具
 * String Operation Utilities
 *
 * 提供字串相關的類型操作工具
 * Provides string-related type manipulation utilities
 */
/**
 * 字串首字母大寫
 * Capitalize first letter of string
 *
 * @example
 * type Result = ITSCapitalize<'hello'>; // 'Hello'
 * type Result2 = ITSCapitalize<'world'>; // 'World'
 */
export type ITSCapitalize<S extends string> = S extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : S;
/**
 * 字串首字母小寫
 * Uncapitalize first letter of string
 *
 * @example
 * type Result = ITSUncapitalize<'Hello'>; // 'hello'
 * type Result2 = ITSUncapitalize<'World'>; // 'world'
 */
export type ITSUncapitalize<S extends string> = S extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : S;
/**
 * 字串轉為大寫
 * Convert string to uppercase
 *
 * @example
 * type Result = ITSToUpperCase<'hello'>; // 'HELLO'
 * type Result2 = ITSToUpperCase<'World'>; // 'WORLD'
 */
export type ITSToUpperCase<S extends string> = Uppercase<S>;
/**
 * 字串轉為小寫
 * Convert string to lowercase
 *
 * @example
 * type Result = ITSToLowerCase<'HELLO'>; // 'hello'
 * type Result2 = ITSToLowerCase<'World'>; // 'world'
 */
export type ITSToLowerCase<S extends string> = Lowercase<S>;
/**
 * TODO: 字串重複指定次數 - 無法實現
 * Repeat string specified number of times
 *
 * TypeScript 無法在類型層級進行遞迴數學運算
 * TypeScript cannot perform recursive mathematical operations at type level
 *
 * @example
 * type Result = ITSRepeat<'abc', 3>; // 'abcabcabc'
 * type Result2 = ITSRepeat<'x', 5>; // 'xxxxx'
 */
/**
 * TODO: 字串長度 - 無法實現
 * Get string length
 *
 * TypeScript 無法在類型層級計算字串長度
 * TypeScript cannot calculate string length at type level
 *
 * @example
 * type Result = ITSStringLength<'hello'>; // 5
 * type Result2 = ITSStringLength<''>; // 0
 */
/**
 * TODO: 字串分割 - 無法實現
 * Split string by separator
 *
 * TypeScript 無法在類型層級進行字串分割操作
 * TypeScript cannot perform string splitting operations at type level
 *
 * @example
 * type Result = ITSSplit<'a,b,c', ','>; // ['a', 'b', 'c']
 * type Result2 = ITSSplit<'hello world', ' '>; // ['hello', 'world']
 */
/**
 * TODO: 字串連接 - 無法實現
 * Join string array with separator
 *
 * TypeScript 無法在類型層級進行陣列連接操作
 * TypeScript cannot perform array joining operations at type level
 *
 * @example
 * type Result = ITSJoin<['a', 'b', 'c'], ','>; // 'a,b,c'
 * type Result2 = ITSJoin<['hello', 'world'], ' '>; // 'hello world'
 */
/**
 * 字串替換
 * Replace substring in string
 *
 * @example
 * type Result = ITSReplace<'hello world', 'world', 'typescript'>; // 'hello typescript'
 * type Result2 = ITSReplace<'abc123', '123', '456'>; // 'abc456'
 */
export type ITSReplace<S extends string, Search extends string, Replace extends string> = S extends `${infer Prefix}${Search}${infer Suffix}` ? `${Prefix}${Replace}${Suffix}` : S;
/**
 * 字串是否包含子字串
 * Check if string contains substring
 *
 * @example
 * type Result = ITSIncludes<'hello world', 'world'>; // true
 * type Result2 = ITSIncludes<'hello world', 'typescript'>; // false
 */
export type ITSIncludes<S extends string, Search extends string> = S extends `${string}${Search}${string}` ? true : false;
/**
 * 字串是否以指定前綴開始
 * Check if string starts with prefix
 *
 * @example
 * type Result = ITSStartsWith<'hello world', 'hello'>; // true
 * type Result2 = ITSStartsWith<'hello world', 'world'>; // false
 */
export type ITSStartsWith<S extends string, Prefix extends string> = S extends `${Prefix}${string}` ? true : false;
/**
 * 字串是否以指定後綴結束
 * Check if string ends with suffix
 *
 * @example
 * type Result = ITSEndsWith<'hello world', 'world'>; // true
 * type Result2 = ITSEndsWith<'hello world', 'hello'>; // false
 */
export type ITSEndsWith<S extends string, Suffix extends string> = S extends `${string}${Suffix}` ? true : false;
