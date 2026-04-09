/**
 * Created by user on 2020/6/6.
 */

/**
 * 陣列去重選項介面
 * Array deduplication options interface
 *
 * @template T - 陣列元素類型 / Array element type
 *
 * @property checker - 自訂相等性檢查函式 / Custom equality check function
 * @property overwrite - 是否覆寫原陣列 / Whether to overwrite original array
 * @property filter - 額外的過濾條件 / Additional filter condition
 * @property removeFromFirst - 是否從第一個開始移除 / Whether to remove from first
 */
export type IOptions<T> = {

	/**
	 * 自訂相等性檢查函式
	 * Custom equality check function
	 *
	 * @param element - 陣列中的現有元素 / Existing element in array
	 * @param array - 要比較的值 / Value to compare
	 * @param arr_new - 新陣列 / New array
	 * @param arr_old - 原始陣列 / Original array
	 * @returns 是否視為相等 / Whether considered equal
	 */
	checker?(element: T[keyof T], array: T[keyof T], arr_new?: T, arr_old?: T): boolean,
	checker?<R>(element: R[keyof R], array: R[keyof R], arr_new?: R, arr_old?: R): boolean,

	/**
	 * 是否覆寫原陣列
	 * Whether to overwrite original array
	 *
	 * 當設為 true 時，會直接修改原陣列而非建立新陣列。
	 * When set to true, will modify the original array instead of creating a new one.
	 */
	overwrite?: boolean,

	/**
	 * 額外的過濾條件
	 * Additional filter condition
	 *
	 * @param v - 陣列元素 / Array element
	 * @returns 是否保留該元素 / Whether to keep the element
	 */
	filter?(v: T[keyof T]): boolean,
	filter?<R>(v: R[keyof R]): boolean,

	/**
	 * 是否從第一個開始移除重複項
	 * Whether to remove duplicates from first
	 *
	 * 當設為 true 時，會移除第一次出現的重複項（保留最後）。
	 * When set to true, will remove first occurrence (keep last).
	 */
	removeFromFirst?: boolean,
};
