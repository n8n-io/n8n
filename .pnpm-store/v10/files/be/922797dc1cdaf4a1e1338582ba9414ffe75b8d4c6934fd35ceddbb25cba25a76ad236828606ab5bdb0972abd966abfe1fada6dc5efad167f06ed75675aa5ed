// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
function formatNullAndUndefined(input) {
    if (input === null || input === undefined) {
        return "null";
    }
    return input;
}
function escapeQuotesIfString(input, previous) {
    let result = input;
    if (typeof input === "string") {
        result = input.replace(/'/g, "''");
        // check if we need to escape this literal
        if (!previous.trim().endsWith("'")) {
            result = `'${result}'`;
        }
    }
    return result;
}
/**
 * Escapes an odata filter expression to avoid errors with quoting string literals.
 * Example usage:
 * ```ts
 * const baseRateMax = 200;
 * const ratingMin = 4;
 * const filter = odata`Rooms/any(room: room/BaseRate lt ${baseRateMax}) and Rating ge ${ratingMin}`;
 * ```
 * For more information on supported syntax see: https://docs.microsoft.com/en-us/azure/search/search-query-odata-filter
 * @param strings - Array of strings for the expression
 * @param values - Array of values for the expression
 */
export function odata(strings, ...values) {
    const results = [];
    for (let i = 0; i < strings.length; i++) {
        results.push(strings[i]);
        if (i < values.length) {
            if (values[i] === null || values[i] === undefined) {
                results.push(formatNullAndUndefined(values[i]));
            }
            else {
                results.push(escapeQuotesIfString(values[i], strings[i]));
            }
        }
    }
    return results.join("");
}
//# sourceMappingURL=odata.js.map