/**
 * Never 類型判斷工具
 * Never Type Detection Utilities
 *
 * 提供檢測類型是否為 never 的工具
 * Provides utilities for detecting if a type is never
 */
/**
 * 檢測類型是否為 never
 * Detect if a type is never
 *
 * 利用 never 是所有類型的子類型特性來檢測
 * Uses the fact that never is a subtype of all types
 *
 * @example
 * type Test1 = ITSLogicIsNever<never>;
 * // type Test1 = true
 *
 * @example
 * type Test2 = ITSLogicIsNever<string>;
 * // type Test2 = false
 */
export type ITSLogicIsNever<T, Y = true, N = false> = [T] extends [never] ? Y : N;
