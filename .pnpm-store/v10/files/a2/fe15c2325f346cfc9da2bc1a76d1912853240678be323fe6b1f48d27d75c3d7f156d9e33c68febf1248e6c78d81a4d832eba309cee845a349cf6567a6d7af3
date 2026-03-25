const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const ohash = require_rolldown_runtime.__toESM(require("ohash"));

//#region src/shared/arrays.ts
/**
* The function `areEqual` compares two arrays and returns true if they are equal in length and have
* the same elements at corresponding indexes.
* @param {any[]} arrayA - An array of any type of elements.
* @param {any[]} arrayB - It looks like you haven't provided the value for `arrayB`. Could you please
* provide the arrayB value so that I can assist you further?
* @returns The function `areEqual` is returning a boolean value, either `true` if the two input arrays
* `arrayA` and `arrayB` are equal, or `false` if they are not equal.
*/
function areEqual(arrayA, arrayB) {
	if (arrayA.length !== arrayB.length) return false;
	for (let index = 0; index < arrayA.length; index++) if (arrayA[index] !== arrayB[index]) return false;
	return true;
}
/**
* The function `findValuesBetween` takes an array and two values, then returns a subarray containing
* elements between the first occurrence of the start value and the first occurrence of the end value
* in the array.
* @param {T[]} array - The `array` parameter is an array of values of type `T`.
* @param {T} start - The `start` parameter is the value that marks the beginning of the range you want
* to find in the array.
* @param {T} end - The `end` parameter in the `findValuesBetween` function represents the end value
* that you want to find in the array. This function will return a subarray of values that are between
* the `start` and `end` values in the original array.
* @returns The `findValuesBetween` function returns an array of values from the input array that are
* between the `start` and `end` values (inclusive). If either the `start` or `end` values are not
* found in the input array, an empty array is returned.
*/
function findValuesBetween(array, start, end) {
	const startIndex = array.findIndex((i) => (0, ohash.isEqual)(i, start));
	const endIndex = array.findIndex((i) => (0, ohash.isEqual)(i, end));
	if (startIndex === -1 || endIndex === -1) return [];
	const [minIndex, maxIndex] = [startIndex, endIndex].sort((a, b) => a - b);
	return array.slice(minIndex, maxIndex + 1);
}

//#endregion
Object.defineProperty(exports, 'areEqual', {
  enumerable: true,
  get: function () {
    return areEqual;
  }
});
Object.defineProperty(exports, 'findValuesBetween', {
  enumerable: true,
  get: function () {
    return findValuesBetween;
  }
});
//# sourceMappingURL=arrays.cjs.map