import { ITSToStringLiteral } from './string';
/**
 * 將數字或 bigint 轉換為字串字面量類型
 * Convert number or bigint to string literal type
 *
 * @example
 * type NumType = ITSNumberString<42>; // '42'
 */
export type ITSNumberString<N extends number | bigint = number> = ITSToStringLiteral<N>;
/**
 * 從字串中解包出數字類型
 * Unpack number type from string
 *
 * @example
 * type Test = ITSNumberString<123>;
 * type Result = ITSUnpackNumberString<Test>; // 123
 */
export type ITSUnpackNumberString<S extends string, R = never> = S extends ITSNumberString<infer N> ? N : R;
/**
 * 數字值類型：數字或字串
 * Number value type: number or string
 */
export type ITSNumberValue = number | string;
/**
 * 數字值類型2：數字或數字字串
 * Number value type 2: number or number string
 */
export type ITSNumberValue2 = number | ITSNumberString;
