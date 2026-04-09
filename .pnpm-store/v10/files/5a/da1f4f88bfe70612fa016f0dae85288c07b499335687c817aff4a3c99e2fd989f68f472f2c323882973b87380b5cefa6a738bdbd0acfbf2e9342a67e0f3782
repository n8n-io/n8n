/**
 * 字串類型推斷工具
 * String Type Inference Utilities
 *
 * 提供從字串字面量類型推斷基礎類型的工具
 * Provides utilities for inferring base types from string literal types
 */
import { ITSToStringLiteralAllowedType } from '../string';
/**
 * 從字串推斷指定類型
 * Infer specified type from string
 *
 * 嘗試將字串字面量類型推斷為指定的基礎類型
 * Attempts to infer a specified base type from a string literal type
 *
 * @example
 * type Num = ITSStringInferToType<'123', number>;
 * // type Num = 123
 *
 * @example
 * type Bool = ITSStringInferToType<'true', boolean>;
 * // type Bool = true
 */
export type ITSStringInferToType<Str extends string, Type extends ITSToStringLiteralAllowedType, R = never> = Str extends `${infer U extends Type}` ? U : R;
/**
 * 從字串推斷數字類型
 * Infer number type from string
 *
 * @example
 * type Num = ITSStringInferToNumber<'123'>;
 * // type Num = 123
 */
export type ITSStringInferToNumber<Str extends string, R = never> = ITSStringInferToType<Str, number, R>;
/**
 * 從字串推斷布林類型
 * Infer boolean type from string
 *
 * @example
 * type Bool = ITSStringInferToBoolean<'true'>;
 * // type Bool = true
 */
export type ITSStringInferToBoolean<Str extends string, R = never> = ITSStringInferToType<Str, boolean, R>;
/**
 * 從字串推斷 null 類型
 * Infer null type from string
 *
 * @example
 * type Null = ITSStringInferToNull<'null'>;
 * // type Null = null
 */
export type ITSStringInferToNull<Str extends string, R = never> = ITSStringInferToType<Str, null, R>;
/**
 * 從字串推斷 undefined 類型
 * Infer undefined type from string
 *
 * @example
 * type Undefined = ITSStringInferToUndefined<'undefined'>;
 * // type Undefined = undefined
 */
export type ITSStringInferToUndefined<Str extends string, R = never> = ITSStringInferToType<Str, undefined, R>;
