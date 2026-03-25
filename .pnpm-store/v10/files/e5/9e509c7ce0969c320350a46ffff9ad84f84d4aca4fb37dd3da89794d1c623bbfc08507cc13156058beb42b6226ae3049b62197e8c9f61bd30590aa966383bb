"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHeaders = normalizeHeaders;
exports.createFetchWithInit = createFetchWithInit;
/**
 * Normalizes HeadersInit to a plain Record<string, string> for manipulation.
 * Handles Headers objects, arrays of tuples, and plain objects.
 */
function normalizeHeaders(headers) {
    if (!headers)
        return {};
    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }
    return { ...headers };
}
/**
 * Creates a fetch function that includes base RequestInit options.
 * This ensures requests inherit settings like credentials, mode, headers, etc. from the base init.
 *
 * @param baseFetch - The base fetch function to wrap (defaults to global fetch)
 * @param baseInit - The base RequestInit to merge with each request
 * @returns A wrapped fetch function that merges base options with call-specific options
 */
function createFetchWithInit(baseFetch = fetch, baseInit) {
    if (!baseInit) {
        return baseFetch;
    }
    // Return a wrapped fetch that merges base RequestInit with call-specific init
    return async (url, init) => {
        const mergedInit = {
            ...baseInit,
            ...init,
            // Headers need special handling - merge instead of replace
            headers: init?.headers ? { ...normalizeHeaders(baseInit.headers), ...normalizeHeaders(init.headers) } : baseInit.headers
        };
        return baseFetch(url, mergedInit);
    };
}
//# sourceMappingURL=transport.js.map