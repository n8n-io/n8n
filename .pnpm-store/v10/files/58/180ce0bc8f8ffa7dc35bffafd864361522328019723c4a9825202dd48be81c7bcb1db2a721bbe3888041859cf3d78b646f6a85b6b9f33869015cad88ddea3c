"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormalizeHeaders = void 0;
const api_1 = require("@opentelemetry/api");
/**
 * Parses headers from config leaving only those that have defined values
 * @param partialHeaders
 */
function validateAndNormalizeHeaders(partialHeaders) {
    const headers = {};
    Object.entries(partialHeaders ?? {}).forEach(([key, value]) => {
        if (typeof value !== 'undefined') {
            headers[key] = String(value);
        }
        else {
            api_1.diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
        }
    });
    return headers;
}
exports.validateAndNormalizeHeaders = validateAndNormalizeHeaders;
//# sourceMappingURL=util.js.map