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
	checker?(element: T[keyof T], array: T[keyof T], arr_new?: T, arr_old?: T): boolean;
	checker?<R>(element: R[keyof R], array: R[keyof R], arr_new?: R, arr_old?: R): boolean;
	/**
	 * 是否覆寫原陣列
	 * Whether to overwrite original array
	 *
	 * 當設為 true 時，會直接修改原陣列而非建立新陣列。
	 * When set to true, will modify the original array instead of creating a new one.
	 */
	overwrite?: boolean;
	/**
	 * 額外的過濾條件
	 * Additional filter condition
	 *
	 * @param v - 陣列元素 / Array element
	 * @returns 是否保留該元素 / Whether to keep the element
	 */
	filter?(v: T[keyof T]): boolean;
	filter?<R>(v: R[keyof R]): boolean;
	/**
	 * 是否從第一個開始移除重複項
	 * Whether to remove duplicates from first
	 *
	 * 當設為 true 時，會移除第一次出現的重複項（保留最後）。
	 * When set to true, will remove first occurrence (keep last).
	 */
	removeFromFirst?: boolean;
};
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
export declare function equals<T>(a1: T, a2: T): boolean;
export declare function equals<T>(a1: T, a2: unknown): a2 is T;
export declare function equals<T>(a1: unknown, a2: T): a1 is T;
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
export declare function defaultFilter<T>(options?: IOptions<T>): <K extends any[]>(val: K[keyof K], index: number, arr: K) => boolean;
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
export declare function defaultChecker<T, R>(element: T, value: R, arr_new?: Array<T | R>, arr_old?: Array<T | R>): boolean;
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
export declare function array_unique<T>(arr: T, options?: IOptions<T>): T;
/**
 * 覆寫模式去重，直接修改原陣列
 * Overwrite mode deduplication, modifies original array
 *
 * @param arr - 要去重的陣列 / Array to deduplicate
 * @param options - 去重選項 / Deduplication options
 * @returns 去重後的陣列（與輸入相同）/ Deduplicated array (same as input)
 */
export declare function array_unique_overwrite<T>(arr: T, options?: IOptions<T>): T;
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
export declare function lazy_unique<T extends any[]>(arr: T): T;
export declare function lazy_unique<T, T1, T2>(a1: T1, a2: T2, ...arr: T[]): Array<T | T1 | T2>;
export declare function lazy_unique<T>(...arr: Array<T | T[]>): T | (T | T[])[];
/**
 * 懶惰唯一化覆寫模式
 * Lazy unique overwrite mode
 *
 * @param arr - 陣列或參數 / Array or arguments
 * @returns 去重後的結果 / Deduplicated result
 */
export declare function lazy_unique_overwrite<T>(...arr: Array<T | T[]>): T | (T | T[])[];

export {
	lazy_unique as default,
};

export {};
