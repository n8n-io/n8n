//#region src/structured_query/utils.d.ts
/**
 * Checks if the provided argument is an object and not an array.
 */
declare function isObject(obj: any): obj is object;
/**
 * Checks if a provided filter is empty. The filter can be a function, an
 * object, a string, or undefined.
 */
declare function isFilterEmpty(filter: ((q: any) => any) | object | string | undefined): filter is undefined;
/**
 * Checks if the provided value is an integer.
 */
declare function isInt(value: unknown): boolean;
/**
 * Checks if the provided value is a floating-point number.
 */
declare function isFloat(value: unknown): boolean;
/**
 * Checks if the provided value is a string that cannot be parsed into a
 * number.
 */
declare function isString(value: unknown): boolean;
/**
 * Checks if the provided value is a boolean.
 */
declare function isBoolean(value: unknown): boolean;
/**
 * Casts a value that might be string or number to actual string or number.
 * Since LLM might return back an integer/float as a string, we need to cast
 * it back to a number, as many vector databases can't handle number as string
 * values as a comparator.
 */
declare function castValue(input: unknown): string | number | boolean;
//#endregion
export { castValue, isBoolean, isFilterEmpty, isFloat, isInt, isObject, isString };
//# sourceMappingURL=utils.d.cts.map