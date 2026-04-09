/**
 * Any 類型判斷工具
 * Any Type Detection Utilities
 *
 * 提供檢測類型是否為 any 的工具
 * Provides utilities for detecting if a type is any
 *
 * @see https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
 */
/**
 * 檢測類型是否為 any
 * Detect if a type is any
 *
 * 利用 any 與任何類型交叉都會得到 any 的特性來檢測
 * Uses the fact that any intersected with any type still results in any
 *
 * @example
 * type Test1 = ITSLogicIsAny<any>;
 * // type Test1 = true
 *
 * @example
 * type Test2 = ITSLogicIsAny<string>;
 * // type Test2 = false
 */
export type ITSLogicIsAny<T, Y = true, N = false> = 0 extends (1 & T) ? Y : N;
/**
 * 檢測類型是否不為 any
 * Detect if a type is not any
 *
 * @example
 * type Test1 = ITSLogicNotAny<any>;
 * // type Test1 = false
 *
 * @example
 * type Test2 = ITSLogicNotAny<string>;
 * // type Test2 = true
 */
export type ITSLogicNotAny<T, Y = true, N = false> = ITSLogicIsAny<T, N, Y>;
