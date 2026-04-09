/**
 * 基礎類型定義
 * Base Type Definitions
 *
 * 提供常用的基礎類型別名和工具類型
 * Provides commonly used base type aliases and utility types
 */
import { ITSTypeFunction } from '../generic';
/**
 * 陣列類型：可讀寫陣列或唯讀陣列
 * Array type: writable array or readonly array
 *
 * @example
 * type StringList = ITSArrayListMaybeReadonly<string>;
 * // type StringList = string[] | readonly string[]
 */
export type ITSArrayListMaybeReadonly<T> = T[] | readonly T[];
/**
 * 鍵的類型：符號、字串或數字
 * Key types: symbol, string, or number
 *
 * @example
 * type Keys = ITSKeys;
 * // type Keys = symbol | string | number
 */
export type ITSKeys = symbol | string | number;
/**
 * 建構函數類型
 * Constructor type
 *
 * @example
 * type MyConstructor = ITSConstructorLike<MyClass>;
 * // type MyConstructor = new (...args: any) => MyClass
 */
export type ITSConstructorLike<T extends any = any> = new (...args: any) => T;
/**
 * 值或陣列：單一值或其陣列
 * Value or array: single value or array of that value
 *
 * @example
 * type StringOrArray = ITSValueOrArray<string>;
 * // type StringOrArray = string | string[]
 */
export type ITSValueOrArray<T> = T | T[];
/**
 * 值或可能唯讀的陣列：單一值、可讀寫陣列或唯讀陣列
 * Value or possibly readonly array: single value, writable array, or readonly array
 *
 * @example
 * type StringOrList = ITSValueOrArrayMaybeReadonly<string>;
 * // type StringOrList = string | string[] | readonly string[]
 */
export type ITSValueOrArrayMaybeReadonly<T> = T | ITSArrayListMaybeReadonly<T>;
/**
 * 屬性鍵類型：字串或符號
 * Property key type: string or symbol
 *
 * @example
 * type PropKey = ITSPropertyKey;
 * // type PropKey = string | symbol
 */
export type ITSPropertyKey = string | symbol;
/**
 * 任意函數類型
 * Any function type
 *
 * @example
 * type AnyFunc = ITSAnyFunction;
 * // type AnyFunc = (...args: any[]) => any
 */
export type ITSAnyFunction = ITSTypeFunction<any>;
/**
 * 基本原始類型：數字、字串或布林值
 * Basic primitive types: number, string, or boolean
 *
 * @example
 * type Primitive = ITSBasicPrimitive;
 * // type Primitive = number | string | boolean
 */
export type ITSBasicPrimitive = number | string | boolean;
/**
 * 可為空的原始類型：null 或 undefined
 * Nullable primitive types: null or undefined
 *
 * @example
 * type Nullish = ITSNullPrimitive;
 * // type Nullish = null | undefined
 */
export type ITSNullPrimitive = null | undefined;
