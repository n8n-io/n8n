// @ts-ignore
import _equals from 'deep-eql';
import { IOptions } from './types';
import { findLastIndex, findIndex } from 'lodash';

/**
 * 深度相等性比較函式
 * Deep equality comparison function
 *
 * 應用情境：
 * - 比較兩個物件是否深度相等
 * - 用於去重邏輯中的相等性判斷
 * - Compare if two objects are deeply equal
 * - Used for equality checking in deduplication logic
 *
 * @param a1 - 要比較的第一個值 / First value to compare
 * @param a2 - 要比較的第二個值 / Second value to compare
 * @returns 是否相等 / Whether equal
 *
 * @example
 * equals({a: 1}, {a: 1}); // => true
 * equals([1, 2], [1, 2]); // => true
 * equals({a: 1}, {a: 2}); // => false
 */
export function equals<T>(a1: T, a2: T): boolean
export function equals<T>(a1: T, a2: unknown): a2 is T
export function equals<T>(a1: unknown, a2: T): a1 is T
export function equals(a1: any, a2: any): boolean
{
	return _equals(a1, a2)
}

/**
 * 建立預設過濾回調函式
 * Create default filter callback function
 *
 * 應用情境：
 * - 為 array_unique 函式建立預設的過濾邏輯
 * - 支援自訂 checker 和 filter 函式
 * - Create default filter logic for array_unique function
 * - Support custom checker and filter functions
 *
 * @param options - 選項物件包含 checker、filter、removeFromFirst / Options object with checker, filter, removeFromFirst
 * @returns 過濾回調函式 / Filter callback function
 */
export function defaultFilter<T>(options: IOptions<T> = {})
{
	const checker = options.checker || defaultChecker;
	const filter = options.filter || null;

	const find = options.removeFromFirst ? findLastIndex : findIndex;

	const cb = <K extends any[]>(val: K[keyof K], index: number, arr: K) =>
	{
		let i = find(arr, a => checker(a, val, arr, arr));
		return i === index && (!filter || filter(val));
	};

	return cb;
}

// @ts-ignore
/**
 * 預設相等性檢查函式
 * Default equality check function
 *
 * 使用 deep-eql 進行深度相等性比較。
 * Uses deep-eql for deep equality comparison.
 *
 * @param element - 陣列中的元素 / Element in array
 * @param value - 要比較的新值 / New value to compare
 * @param arr_new - 新陣列 / New array
 * @param arr_old - 舊陣列 / Old array
 * @returns 是否相等 / Whether equal
 */
export function defaultChecker<T, R>(element: T, value: R, arr_new?: Array<T | R>, arr_old?: Array<T | R>): boolean
{
	return _equals(element, value);
}
