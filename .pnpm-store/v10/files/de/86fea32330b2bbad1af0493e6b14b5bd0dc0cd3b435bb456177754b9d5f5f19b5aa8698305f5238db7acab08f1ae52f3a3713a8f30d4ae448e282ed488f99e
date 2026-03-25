const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const ohash = require_rolldown_runtime.__toESM(require("ohash"));

//#region src/Listbox/utils.ts
function queryCheckedElement(parentEl) {
	return parentEl?.querySelector("[data-state=checked]");
}
function valueComparator(value, currentValue, comparator) {
	if (value === void 0) return false;
	else if (Array.isArray(value)) return value.some((val) => compare(val, currentValue, comparator));
	else return compare(value, currentValue, comparator);
}
function compare(value, currentValue, comparator) {
	if (value === void 0 || currentValue === void 0) return false;
	if (typeof value === "string") return value === currentValue;
	if (typeof comparator === "function") return comparator(value, currentValue);
	if (typeof comparator === "string") return value?.[comparator] === currentValue?.[comparator];
	return (0, ohash.isEqual)(value, currentValue);
}

//#endregion
Object.defineProperty(exports, 'compare', {
  enumerable: true,
  get: function () {
    return compare;
  }
});
Object.defineProperty(exports, 'queryCheckedElement', {
  enumerable: true,
  get: function () {
    return queryCheckedElement;
  }
});
Object.defineProperty(exports, 'valueComparator', {
  enumerable: true,
  get: function () {
    return valueComparator;
  }
});
//# sourceMappingURL=utils.cjs.map