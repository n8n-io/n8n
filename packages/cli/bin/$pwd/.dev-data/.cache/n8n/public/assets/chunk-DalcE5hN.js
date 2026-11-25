import { t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { Mr as require__baseSlice, Wr as require_toInteger, ga as require__isIterateeCall } from "./vendor-Hx42-oQF.js";
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/chunk.js
var require_chunk = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseSlice = require__baseSlice();
	var isIterateeCall = require__isIterateeCall();
	var toInteger = require_toInteger();
	var nativeCeil = Math.ceil;
	var nativeMax = Math.max;
	/**
	* Creates an array of elements split into groups the length of `size`.
	* If `array` can't be split evenly, the final chunk will be the remaining
	* elements.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category Array
	* @param {Array} array The array to process.
	* @param {number} [size=1] The length of each chunk
	* @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
	* @returns {Array} Returns the new array of chunks.
	* @example
	*
	* _.chunk(['a', 'b', 'c', 'd'], 2);
	* // => [['a', 'b'], ['c', 'd']]
	*
	* _.chunk(['a', 'b', 'c', 'd'], 3);
	* // => [['a', 'b', 'c'], ['d']]
	*/
	function chunk(array, size, guard) {
		if (guard ? isIterateeCall(array, size, guard) : size === void 0) size = 1;
		else size = nativeMax(toInteger(size), 0);
		var length = array == null ? 0 : array.length;
		if (!length || size < 1) return [];
		var index = 0, resIndex = 0, result = Array(nativeCeil(length / size));
		while (index < length) result[resIndex++] = baseSlice(array, index, index += size);
		return result;
	}
	module.exports = chunk;
}));
//#endregion
export { require_chunk as t };
