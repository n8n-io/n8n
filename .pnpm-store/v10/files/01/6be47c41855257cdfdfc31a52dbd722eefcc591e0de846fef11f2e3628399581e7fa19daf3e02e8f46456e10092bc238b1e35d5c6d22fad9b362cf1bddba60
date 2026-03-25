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
exports.loggingErrorHandler = void 0;
const api_1 = require("@opentelemetry/api");
/**
 * Returns a function that logs an error using the provided logger, or a
 * console logger if one was not provided.
 */
function loggingErrorHandler() {
    return (ex) => {
        api_1.diag.error(stringifyException(ex));
    };
}
exports.loggingErrorHandler = loggingErrorHandler;
/**
 * Converts an exception into a string representation
 * @param {Exception} ex
 */
function stringifyException(ex) {
    if (typeof ex === 'string') {
        return ex;
    }
    else {
        return JSON.stringify(flattenException(ex));
    }
}
/**
 * Flattens an exception into key-value pairs by traversing the prototype chain
 * and coercing values to strings. Duplicate properties will not be overwritten;
 * the first insert wins.
 */
function flattenException(ex) {
    const result = {};
    let current = ex;
    while (current !== null) {
        Object.getOwnPropertyNames(current).forEach(propertyName => {
            if (result[propertyName])
                return;
            const value = current[propertyName];
            if (value) {
                result[propertyName] = String(value);
            }
        });
        current = Object.getPrototypeOf(current);
    }
    return result;
}
//# sourceMappingURL=logging-error-handler.js.map