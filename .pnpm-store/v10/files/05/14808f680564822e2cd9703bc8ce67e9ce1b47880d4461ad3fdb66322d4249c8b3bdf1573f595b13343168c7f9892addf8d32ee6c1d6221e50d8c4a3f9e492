/**
 * 列舉類型工具
 * Enum Type Utilities
 *
 * 提供列舉類型的操作工具
 * Provides enum type manipulation utilities
 */
import { ITSEnumLike } from '../../type/record/enum';
import { ITSValueOf } from '../key-value';
import { ITSStringInferToNumber } from '../string/infer';
import { ITSToStringLiteral } from '../string';
/**
 * 從列舉類型中排除指定值
 * Exclude specified values from enum type
 *
 * @example
 * enum Color { Red, Green, Blue }
 * type ExcludedRed = ITSExcludeEnumValue<Color, Color.Red>;
 * // type ExcludedRed = Color.Green | Color.Blue
 */
export type ITSExcludeEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Exclude<ITSValueOf<Enum>, U>;
/**
 * 從列舉類型中提取指定值
 * Extract specified values from enum type
 *
 * @example
 * enum Color { Red, Green, Blue }
 * type ExtractedRed = ITSExtractEnumValue<Color, Color.Red>;
 * // type ExtractedRed = Color.Red
 */
export type ITSExtractEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Extract<ITSValueOf<Enum>, U>;
/**
 * 將數字列舉轉換為純數字類型
 * Convert number enum to pure number type
 *
 * @example
 * enum Status { Active = 1, Inactive = 2 }
 * type NumStatus = ITSNumberEnumToNumber<Status>;
 * // type NumStatus = 1 | 2
 */
export type ITSNumberEnumToNumber<T extends number> = ITSStringInferToNumber<ITSToStringLiteral<Extract<T, number>>>;
/**
 * 數字列舉與數字的聯合類型
 * Union type of number enum and number
 *
 * @example
 * enum Status { Active = 1, Inactive = 2 }
 * type StatusValue = ITSNumberEnumAndNumber<Status>;
 * // type StatusValue = 1 | 2 | number
 */
export type ITSNumberEnumAndNumber<T extends number> = Extract<T, number> | ITSNumberEnumToNumber<T>;
