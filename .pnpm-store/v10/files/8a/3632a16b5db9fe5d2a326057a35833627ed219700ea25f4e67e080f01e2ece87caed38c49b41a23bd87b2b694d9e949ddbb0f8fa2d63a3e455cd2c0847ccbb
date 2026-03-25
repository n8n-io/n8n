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
exports.endSpan = void 0;
const api_1 = require("@opentelemetry/api");
const endSpan = (span, err) => {
    if (err) {
        span.recordException(err);
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: err.message,
        });
    }
    span.end();
};
exports.endSpan = endSpan;
//# sourceMappingURL=utils.js.map