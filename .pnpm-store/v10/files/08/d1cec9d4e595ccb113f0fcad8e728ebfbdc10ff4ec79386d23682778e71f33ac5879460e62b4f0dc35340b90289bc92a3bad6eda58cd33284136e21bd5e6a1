//#region src/structured_query/utils.ts
/**
* Checks if the provided argument is an object and not an array.
*/
function isObject(obj) {
	return obj && typeof obj === "object" && !Array.isArray(obj);
}
/**
* Checks if a provided filter is empty. The filter can be a function, an
* object, a string, or undefined.
*/
function isFilterEmpty(filter) {
	if (!filter) return true;
	if (typeof filter === "string" && filter.length > 0) return false;
	if (typeof filter === "function") return false;
	return isObject(filter) && Object.keys(filter).length === 0;
}
/**
* Checks if the provided value is an integer.
*/
function isInt(value) {
	if (typeof value === "number") return value % 1 === 0;
	else if (typeof value === "string") {
		const numberValue = parseInt(value, 10);
		return !Number.isNaN(numberValue) && numberValue % 1 === 0 && numberValue.toString() === value;
	}
	return false;
}
/**
* Checks if the provided value is a floating-point number.
*/
function isFloat(value) {
	if (typeof value === "number") return value % 1 !== 0;
	else if (typeof value === "string") {
		const numberValue = parseFloat(value);
		return !Number.isNaN(numberValue) && numberValue % 1 !== 0 && numberValue.toString() === value;
	}
	return false;
}
/**
* Checks if the provided value is a string that cannot be parsed into a
* number.
*/
function isString(value) {
	return typeof value === "string" && (Number.isNaN(parseFloat(value)) || parseFloat(value).toString() !== value);
}
/**
* Checks if the provided value is a boolean.
*/
function isBoolean(value) {
	return typeof value === "boolean";
}
/**
* Casts a value that might be string or number to actual string or number.
* Since LLM might return back an integer/float as a string, we need to cast
* it back to a number, as many vector databases can't handle number as string
* values as a comparator.
*/
function castValue(input) {
	let value;
	if (isString(input)) value = input;
	else if (isInt(input)) value = parseInt(input, 10);
	else if (isFloat(input)) value = parseFloat(input);
	else if (isBoolean(input)) value = Boolean(input);
	else throw new Error("Unsupported value type");
	return value;
}
//#endregion
export { castValue, isBoolean, isFilterEmpty, isFloat, isInt, isObject, isString };

//# sourceMappingURL=utils.js.map