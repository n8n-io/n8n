"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHeaders = buildHeaders;
/**
 * Support the three possible header formats we'd get from a request or
 * response:
 *
 * - A flat array with both names and values: [name, value, name, value, ...]
 * - An object with array values: { name: [value, value] }
 * - An object with string values: { name: value }
 */
function buildHeaders(headers) {
    const list = [];
    if (Array.isArray(headers)) {
        for (let i = 0; i < headers.length; i += 2) {
            list.push({
                name: headers[i],
                value: headers[i + 1],
            });
        }
    }
    else if (headers instanceof Map || headers.entries) {
        // Handle both Map and Headers objects (which have entries())
        for (const [name, value] of headers.entries()) {
            list.push({ name, value });
        }
    }
    else if (typeof headers === 'object') {
        for (const [name, value] of Object.entries(headers)) {
            list.push({ name, value: value });
        }
    }
    return list;
}
//# sourceMappingURL=build-headers.js.map