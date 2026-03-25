const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const ohash = require_rolldown_runtime.__toESM(require("ohash"));

//#region src/Select/utils.ts
const OPEN_KEYS = [
	" ",
	"Enter",
	"ArrowUp",
	"ArrowDown"
];
const SELECTION_KEYS = [" ", "Enter"];
const CONTENT_MARGIN = 10;
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
function shouldShowPlaceholder(value) {
	return value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
}

//#endregion
Object.defineProperty(exports, 'CONTENT_MARGIN', {
  enumerable: true,
  get: function () {
    return CONTENT_MARGIN;
  }
});
Object.defineProperty(exports, 'OPEN_KEYS', {
  enumerable: true,
  get: function () {
    return OPEN_KEYS;
  }
});
Object.defineProperty(exports, 'SELECTION_KEYS', {
  enumerable: true,
  get: function () {
    return SELECTION_KEYS;
  }
});
Object.defineProperty(exports, 'compare', {
  enumerable: true,
  get: function () {
    return compare;
  }
});
Object.defineProperty(exports, 'shouldShowPlaceholder', {
  enumerable: true,
  get: function () {
    return shouldShowPlaceholder;
  }
});
Object.defineProperty(exports, 'valueComparator', {
  enumerable: true,
  get: function () {
    return valueComparator;
  }
});
//# sourceMappingURL=utils.cjs.map