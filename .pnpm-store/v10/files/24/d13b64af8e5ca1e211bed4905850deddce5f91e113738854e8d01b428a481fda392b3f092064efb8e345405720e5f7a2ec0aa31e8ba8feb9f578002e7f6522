/**
 * 列舉類型定義
 * Enum Type Definitions
 *
 * 提供列舉類型的相關類型定義
 * Provides enum type related type definitions
 */
import { ITSReadonlyRecord } from './readonly';
import { ITSTypeAndStringLiteral } from '../../helper/string';
/**
 * 列舉類型
 * Enum type
 *
 * 支援字串列舉、數字列舉或兩者的組合
 * Supports string enums, number enums, or a combination of both
 *
 * @example
 * // 字串列舉
 * enum EnumString { A = 'a', B = 'b' }
 * // 數字列舉
 * enum EnumNumber { A = 1, B = 2 }
 * // 混合列舉
 * enum EnumMixed { A = 'a', B = 1 }
 */
export type ITSEnumLike<K extends string = string, V extends string | number = string | number> = ITSReadonlyRecord<K, V> | (V extends number ? ITSNumberEnumLikeReverse<K, Exclude<V, string>> : ITSEnumLikeReverseExcludeNumber);
/**
 * 字串列舉類型
 * String enum type
 *
 * @example
 * enum EnumString { A = 'a', B = 'b' }
 * type T = ITSStringEnumLike<EnumString>;
 */
export type ITSStringEnumLike<K extends string = string, V extends string = string> = (ITSReadonlyRecord<K, V> | ITSStringEnumLikeReverse<K, V>) & ITSEnumLikeReverseExcludeNumber;
/**
 * 數字列舉類型
 * Number enum type
 *
 * @example
 * enum EnumNumber { A = 1, B = 2 }
 * type T = ITSNumberEnumLike<EnumNumber>;
 */
export type ITSNumberEnumLike<K extends string = string, V extends number = number> = ITSReadonlyRecord<K, V> | ITSNumberEnumLikeReverse<K, V>;
/**
 * 字串列舉反向映射類型（內部使用）
 * String enum reverse mapping type (internal use)
 *
 * @internal
 */
export type ITSStringEnumLikeReverse<K extends string = string, V extends string = string> = ITSReadonlyRecord<V, K>;
/**
 * 數字列舉反向映射類型（內部使用）
 * Number enum reverse mapping type (internal use)
 *
 * @see https://github.com/microsoft/TypeScript/issues/51105
 *
 * @internal
 */
export type ITSNumberEnumLikeReverse<K extends string = string, V extends number = number> = ITSReadonlyRecord<Exclude<ITSTypeAndStringLiteral<V>, K>, K>;
/**
 * 排除數字的列舉反向映射（內部使用）
 * Enum reverse mapping excluding number (internal use)
 *
 * @internal
 */
export type ITSEnumLikeReverseExcludeNumber = ITSReadonlyRecord<number, void | never>;
