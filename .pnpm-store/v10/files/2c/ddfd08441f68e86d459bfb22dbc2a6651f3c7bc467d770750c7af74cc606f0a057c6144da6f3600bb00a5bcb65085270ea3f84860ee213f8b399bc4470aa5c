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
exports.parseRetryAfterToMills = exports.isExportRetryable = void 0;
function isExportRetryable(statusCode) {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
}
exports.isExportRetryable = isExportRetryable;
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