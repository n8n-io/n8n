const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_nullish = require('./nullish.cjs');
const ohash = require_rolldown_runtime.__toESM(require("ohash"));

//#region src/shared/isValueEqualOrExist.ts
/**
* The function `isValueEqualOrExist` checks if a value is equal to or exists in another value or
* array.
* @param {T | T[] | undefined} base - It represents the base value that you want to compare with the `current` value.
* @param {T | T[] | undefined} current - The `current` parameter represents the current value that you want to compare with the `base` value or values.
* @returns The `isValueEqualOrExist` function returns a boolean value. It checks if the `base` value
* is equal to the `current` value or if the `current` value exists within the `base` value. The
* function handles cases where `base` can be a single value, an array of values, or undefined.
*/
function isValueEqualOrExist(base, current) {
	if (require_shared_nullish.isNullish(base)) return false;
	if (Array.isArray(base)) return base.some((val) => (0, ohash.isEqual)(val, current));
	else return (0, ohash.isEqual)(base, current);
}

//#endregion
Object.defineProperty(exports, 'isValueEqualOrExist', {
  enumerable: true,
  get: function () {
    return isValueEqualOrExist;
  }
});
//# sourceMappingURL=isValueEqualOrExist.cjs.map