import { isEqual } from "ohash";

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
	return isEqual(value, currentValue);
}

//#endregion
export { compare, queryCheckedElement, valueComparator };
//# sourceMappingURL=utils.js.map