"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormalizeHeaders = void 0;
const api_1 = require("@opentelemetry/api");
/**
 * Parses headers from config leaving only those that have defined values
 * @param partialHeaders
 */
function validateAndNormalizeHeaders(partialHeaders) {
    return () => {
        const headers = {};
        Object.entries(partialHeaders?.() ?? {}).forEach(([key, value]) => {
            if (typeof value !== 'undefined') {
                headers[key] = String(value);
            }
            else {
                api_1.diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
            }
        });
        return headers;
    };
}
exports.validateAndNormalizeHeaders = validateAndNormalizeHeaders;
//# sourceMappingURL=util.js.map