import { defaultFilter, equals, defaultChecker } from './util';

import { IOptions } from './types';

export * from './types';
export * from './util';

/**
 * 取得陣列的唯一值，支援深度比較
 * Get unique values from array with deep comparison support
 *
 * 應用情境：
 * - 去除複雜物件陣列中的重複項
 * - 處理巢狀物件和陣列的比對
 * - 支援自訂相等性判斷函式
 * - Remove duplicates from complex object arrays
 * - Handle nested objects and arrays comparison
 * - Support custom equality check function
 *
 * @param arr - 要去重的陣列 / Array to deduplicate
 * @param options - 去重選項 / Deduplication options
 * @returns 去重後的陣列 / Deduplicated array
 * @throws TypeError - 當輸入不是陣列時 / When input is not an array
 *
 * @example
 * // 基本使用
 * array_unique([1, 2, 2, 3]); // => [1, 2, 3]
 *
 * // 物件去重
 * array_unique([{a: 1}, {a: 1}, {a: 2}]); // => [{a: 1}, {a: 2}]
 *
 * // 巢狀陣列去重
 * array_unique([[1,2], [1,2], [1,3]]); // => [[1,2], [1,3]]
 */
export function array_unique<T>(arr: T, options: IOptions<T> = {}): T
{
	if (!Array.isArray(arr))
	{
		throw new TypeError(`Expected an Array but got ${typeof arr}.`)
	}

	const cb = defaultFilter(options);

	if (options.overwrite)
	{
		let index = arr.length;

		while (index--)
		{
			let val = arr[index];

			if (!cb(val, index, arr))
			{
				arr.splice(index, 1);
			}
		}

		return arr;
	}

	// @ts-ignore
	return arr.filter(cb);
}

/**
 * 覆寫模式去重，直接修改原陣列
 * Overwrite mode deduplication, modifies original array
 *
 * @param arr - 要去重的陣列 / Array to deduplicate
 * @param options - 去重選項 / Deduplication options
 * @returns 去重後的陣列（與輸入相同）/ Deduplicated array (same as input)
 */
export function array_unique_overwrite<T>(arr: T, options: IOptions<T> = {}): T
{
	return array_unique(arr, {
		...options,
		overwrite: true,
	});
}

/**
 * 懶惰唯一化函式，支援多種呼叫方式
 * Lazy unique function with multiple calling patterns
 *
 * 應用情境：
 * - 單一陣列輸入
 * - 多個參數或陣列混合輸入
 * - 靈活的 API 設計
 * - Single array input
 * - Multiple arguments or array mixing
 * - Flexible API design
 *
 * @param arr - 陣列或單一元素 / Array or single element
 * @returns 去重後的結果 / Deduplicated result
 *
 * @example
 * // 單一陣列
 * lazy_unique([1, 2, 2, 3]); // => [1, 2, 3]
 *
 * // 多個參數
 * lazy_unique(1, 2, 2, 3); // => [1, 2, 3]
 *
 * // 混合
 * lazy_unique([1, 2], [2, 3]); // => [1, 2, 3]
 */
export function lazy_unique<T extends any[]>(arr: T): T
export function lazy_unique<T, T1, T2>(a1: T1, a2: T2, ...arr: T[]): Array<T | T1 | T2>
export function lazy_unique<T>(...arr: Array<T | T[]>): T | (T | T[])[]
// @ts-ignore
export function lazy_unique<T>(...arr: Array<T | T[]>)
{
	if (arr.length > 1)
	{
		return array_unique(arr);
	}

	return array_unique(arr[0]);
}

/**
 * 懶惰唯一化覆寫模式
 * Lazy unique overwrite mode
 *
 * @param arr - 陣列或參數 / Array or arguments
 * @returns 去重後的結果 / Deduplicated result
 */
export function lazy_unique_overwrite<T>(...arr: Array<T | T[]>)
{
	if (arr.length > 1)
	{
		return array_unique_overwrite(arr);
	}

	return array_unique_overwrite(arr[0]);
}

/**
 * 導出工具函式 / Export utility functions
 */
export {
	equals,
	defaultFilter,
	defaultChecker,
}

if (process.env.TSDX_FORMAT !== 'esm')
{
	Object.defineProperty(lazy_unique, "array_unique", { value: array_unique });
	Object.defineProperty(lazy_unique, "array_unique_overwrite", { value: array_unique_overwrite });
	Object.defineProperty(lazy_unique, "lazy_unique_overwrite", { value: lazy_unique_overwrite });

	Object.defineProperty(lazy_unique, "equals", { value: equals });
	Object.defineProperty(lazy_unique, "defaultFilter", { value: defaultFilter });
	Object.defineProperty(lazy_unique, "defaultChecker", { value: defaultChecker });

	Object.defineProperty(lazy_unique, "lazy_unique", { value: lazy_unique });
	Object.defineProperty(lazy_unique, "default", { value: lazy_unique });

	Object.defineProperty(lazy_unique, "__esModule", { value: true });
}

export default lazy_unique
