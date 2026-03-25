// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
function isQueryParameterWithOptions(x) {
    const value = x.value;
    return (value !== undefined && value.toString !== undefined && typeof value.toString === "function");
}
/**
 * Builds the request url, filling in query and path parameters
 * @param endpoint - base url which can be a template url
 * @param routePath - path to append to the endpoint
 * @param pathParameters - values of the path parameters
 * @param options - request parameters including query parameters
 * @returns a full url with path and query parameters
 */
export function buildRequestUrl(endpoint, routePath, pathParameters, options = {}) {
    if (routePath.startsWith("https://") || routePath.startsWith("http://")) {
        return routePath;
    }
    endpoint = buildBaseUrl(endpoint, options);
    routePath = buildRoutePath(routePath, pathParameters, options);
    const requestUrl = appendQueryParams(`${endpoint}/${routePath}`, options);
    const url = new URL(requestUrl);
    return (url
        .toString()
        // Remove double forward slashes
        .replace(/([^:]\/)\/+/g, "$1"));
}
function getQueryParamValue(key, allowReserved, style, param) {
    let separator;
    if (style === "pipeDelimited") {
        separator = "|";
    }
    else if (style === "spaceDelimited") {
        separator = "%20";
    }
    else {
        separator = ",";
    }
    let paramValues;
    if (Array.isArray(param)) {
        paramValues = param;
    }
    else if (typeof param === "object" && param.toString === Object.prototype.toString) {
        // If the parameter is an object without a custom toString implementation (e.g. a Date),
        // then we should deconstruct the object into an array [key1, value1, key2, value2, ...].
        paramValues = Object.entries(param).flat();
    }
    else {
        paramValues = [param];
    }
    const value = paramValues
        .map((p) => {
        if (p === null || p === undefined) {
            return "";
        }
        if (!p.toString || typeof p.toString !== "function") {
            throw new Error(`Query parameters must be able to be represented as string, ${key} can't`);
        }
        const rawValue = p.toISOString !== undefined ? p.toISOString() : p.toString();
        return allowReserved ? rawValue : encodeURIComponent(rawValue);
    })
        .join(separator);
    return `${allowReserved ? key : encodeURIComponent(key)}=${value}`;
}
function appendQueryParams(url, options = {}) {
    if (!options.queryParameters) {
        return url;
    }
    const parsedUrl = new URL(url);
    const queryParams = options.queryParameters;
    const paramStrings = [];
    for (const key of Object.keys(queryParams)) {
        const param = queryParams[key];
        if (param === undefined || param === null) {
            continue;
        }
        const hasMetadata = isQueryParameterWithOptions(param);
        const rawValue = hasMetadata ? param.value : param;
        const explode = hasMetadata ? (param.explode ?? false) : false;
        const style = hasMetadata && param.style ? param.style : "form";
        if (explode) {
            if (Array.isArray(rawValue)) {
                for (const item of rawValue) {
                    paramStrings.push(getQueryParamValue(key, options.skipUrlEncoding ?? false, style, item));
                }
            }
            else if (typeof rawValue === "object") {
                // For object explode, the name of the query parameter is ignored and we use the object key instead
                for (const [actualKey, value] of Object.entries(rawValue)) {
                    paramStrings.push(getQueryParamValue(actualKey, options.skipUrlEncoding ?? false, style, value));
                }
            }
            else {
                // Explode doesn't really make sense for primitives
                throw new Error("explode can only be set to true for objects and arrays");
            }
        }
        else {
            paramStrings.push(getQueryParamValue(key, options.skipUrlEncoding ?? false, style, rawValue));
        }
    }
    if (parsedUrl.search !== "") {
        parsedUrl.search += "&";
    }
    parsedUrl.search += paramStrings.join("&");
    return parsedUrl.toString();
}
export function buildBaseUrl(endpoint, options) {
    if (!options.pathParameters) {
        return endpoint;
    }
    const pathParams = options.pathParameters;
    for (const [key, param] of Object.entries(pathParams)) {
        if (param === undefined || param === null) {
            throw new Error(`Path parameters ${key} must not be undefined or null`);
        }
        if (!param.toString || typeof param.toString !== "function") {
            throw new Error(`Path parameters must be able to be represented as string, ${key} can't`);
        }
        let value = param.toISOString !== undefined ? param.toISOString() : String(param);
        if (!options.skipUrlEncoding) {
            value = encodeURIComponent(param);
        }
        endpoint = replaceAll(endpoint, `{${key}}`, value) ?? "";
    }
    return endpoint;
}
function buildRoutePath(routePath, pathParameters, options = {}) {
    for (const pathParam of pathParameters) {
        const allowReserved = typeof pathParam === "object" && (pathParam.allowReserved ?? false);
        let value = typeof pathParam === "object" ? pathParam.value : pathParam;
        if (!options.skipUrlEncoding && !allowReserved) {
            value = encodeURIComponent(value);
        }
        routePath = routePath.replace(/\{[\w-]+\}/, String(value));
    }
    return routePath;
}
/**
 * Replace all of the instances of searchValue in value with the provided replaceValue.
 * @param value - The value to search and replace in.
 * @param searchValue - The value to search for in the value argument.
 * @param replaceValue - The value to replace searchValue with in the value argument.
 * @returns The value where each instance of searchValue was replaced with replacedValue.
 */
export function replaceAll(value, searchValue, replaceValue) {
    return !value || !searchValue ? value : value.split(searchValue).join(replaceValue || "");
}
//# sourceMappingURL=urlHelpers.js.map