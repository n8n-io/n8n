/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
/**
 * Parses headers from config leaving only those that have defined values
 * @param partialHeaders
 */
export function validateAndNormalizeHeaders(partialHeaders) {
    const headers = {};
    Object.entries(partialHeaders ?? {}).forEach(([key, value]) => {
        if (typeof value !== 'undefined') {
            headers[key] = String(value);
        }
        else {
            diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
        }
    });
    return headers;
}
//# sourceMappingURL=util.js.map