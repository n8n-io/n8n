/**
 * 聯合類型邏輯工具
 * Union Type Logic Utilities
 *
 * 提供聯合類型相關的邏輯判斷工具
 * Provides union type-related logic detection utilities
 */
import { ITSUnionToIntersection } from '../../helper/intersection';
import { ITSLogicIsNever } from '../never';
/**
 * 檢測類型是否為聯合類型
 * Detect if a type is a union type
 *
 * @example
 * type Test1 = ITSLogicIsUnion<string | number>;
 * // type Test1 = true
 *
 * @example
 * type Test2 = ITSLogicIsUnion<string>;
 * // type Test2 = false
 */
export type ITSLogicIsUnion<T, Y = true, N = false> = [T] extends [ITSUnionToIntersection<T>] ? N : Y;
/**
 * 檢測類型是否為單一非聯合類型
 * Detect if a type is a single non-union type
 *
 * @see https://stackoverflow.com/a/49982981/4563339
 *
 * @example
 * type Test1 = ITSLogicIsSingleNonUnion01<'' | '4' | any, string>;
 * // type Test1 = false (因為是聯合類型)
 *
 * @example
 * type Test2 = ITSLogicIsSingleNonUnion01<'' & '4' & any, string>;
 * // type Test2 = false (因為是交集類型)
 *
 * @example
 * type Test3 = ITSLogicIsSingleNonUnion01<'', string>;
 * // type Test3 = true (因為是單一類型)
 */
export type ITSLogicIsSingleNonUnion01<T, U extends any, Y = true, N = false> = U extends T ? N : ITSLogicIsNever<T, N, ITSLogicIsUnion<T, N, Y>>;
