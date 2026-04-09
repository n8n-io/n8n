"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRetryAfterToMills = exports.isExportHTTPErrorRetryable = void 0;
function isExportHTTPErrorRetryable(statusCode) {
    return (statusCode === 429 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504);
}
exports.isExportHTTPErrorRetryable = isExportHTTPErrorRetryable;
function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
        return undefined;
    }
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
        return seconds > 0 ? seconds * 1000 : -1;
    }
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After#directives
    const delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
        return delay;
    }
    return 0;
}
exports.parseRetryAfterToMills = parseRetryAfterToMills;
//# sourceMappingURL=is-export-retryable.js.map