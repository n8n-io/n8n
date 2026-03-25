"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryParamsStringify = void 0;
// Everything in this file is lifted from the generated openapi runtime.
// I need to create a small modification of the generated queryParamStringify
// function in order to fix an issue with array params.
//
// See https://github.com/pinecone-io/pinecone-ts-client/pull/74
function queryParamsStringify(params, prefix = '') {
    return Object.keys(params)
        .map((key) => querystringSingleKey(key, params[key], prefix))
        .filter((part) => part.length > 0)
        .join('&');
}
exports.queryParamsStringify = queryParamsStringify;
function querystringSingleKey(key, value, keyPrefix = '') {
    const fullKey = keyPrefix + (keyPrefix.length ? `[${key}]` : key);
    // This is a one line change from the default querystring implementation. Checking
    // with `Array.isArray` instead of `value instanceof Array` allows us to get the
    // the correct behavior when stringifying array params.
    if (Array.isArray(value)) {
        const multiValue = value
            .map((singleValue) => encodeURIComponent(String(singleValue)))
            .join(`&${encodeURIComponent(fullKey)}=`);
        return `${encodeURIComponent(fullKey)}=${multiValue}`;
    }
    if (value instanceof Set) {
        const valueAsArray = Array.from(value);
        return querystringSingleKey(key, valueAsArray, keyPrefix);
    }
    if (value instanceof Date) {
        return `${encodeURIComponent(fullKey)}=${encodeURIComponent(value.toISOString())}`;
    }
    if (value instanceof Object) {
        return queryParamsStringify(value, fullKey);
    }
    return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
}
//# sourceMappingURL=queryParamsStringify.js.map