(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('deep-eql'), require('lodash-es')) :
	typeof define === 'function' && define.amd ? define(['exports', 'deep-eql', 'lodash-es'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ArrayHyperUnique = {}, global._equals, global.lodashEs));
})(this, (function (exports, _equals, lodashEs) { 'use strict';

	// @ts-ignore
	function equals(a1, a2) {
	  return _equals(a1, a2);
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
	function defaultFilter(options = {}) {
	  const checker = options.checker || defaultChecker;
	  const filter = options.filter || null;
	  const find = options.removeFromFirst ? lodashEs.findLastIndex : lodashEs.findIndex;
	  const cb = (val, index, arr) => {
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
	function defaultChecker(element, value, arr_new, arr_old) {
	  return _equals(element, value);
	}

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
	function array_unique(arr, options = {}) {
	  if (!Array.isArray(arr)) {
	    throw new TypeError(`Expected an Array but got ${typeof arr}.`);
	  }
	  const cb = defaultFilter(options);
	  if (options.overwrite) {
	    let index = arr.length;
	    while (index--) {
	      let val = arr[index];
	      if (!cb(val, index, arr)) {
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
	function array_unique_overwrite(arr, options = {}) {
	  return array_unique(arr, {
	    ...options,
	    overwrite: true
	  });
	}
	// @ts-ignore
	function lazy_unique(...arr) {
	  if (arr.length > 1) {
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
	function lazy_unique_overwrite(...arr) {
	  if (arr.length > 1) {
	    return array_unique_overwrite(arr);
	  }
	  return array_unique_overwrite(arr[0]);
	}
	{
	  Object.defineProperty(lazy_unique, "array_unique", {
	    value: array_unique
	  });
	  Object.defineProperty(lazy_unique, "array_unique_overwrite", {
	    value: array_unique_overwrite
	  });
	  Object.defineProperty(lazy_unique, "lazy_unique_overwrite", {
	    value: lazy_unique_overwrite
	  });
	  Object.defineProperty(lazy_unique, "equals", {
	    value: equals
	  });
	  Object.defineProperty(lazy_unique, "defaultFilter", {
	    value: defaultFilter
	  });
	  Object.defineProperty(lazy_unique, "defaultChecker", {
	    value: defaultChecker
	  });
	  Object.defineProperty(lazy_unique, "lazy_unique", {
	    value: lazy_unique
	  });
	  Object.defineProperty(lazy_unique, "default", {
	    value: lazy_unique
	  });
	  Object.defineProperty(lazy_unique, "__esModule", {
	    value: true
	  });
	}

	exports.array_unique = array_unique;
	exports.array_unique_overwrite = array_unique_overwrite;
	exports.default = lazy_unique;
	exports.defaultChecker = defaultChecker;
	exports.defaultFilter = defaultFilter;
	exports.equals = equals;
	exports.lazy_unique = lazy_unique;
	exports.lazy_unique_overwrite = lazy_unique_overwrite;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.development.cjs.map
