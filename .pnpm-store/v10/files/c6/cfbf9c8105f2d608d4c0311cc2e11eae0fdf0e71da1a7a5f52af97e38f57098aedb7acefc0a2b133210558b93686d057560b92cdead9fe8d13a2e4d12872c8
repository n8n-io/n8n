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
exports.globalErrorHandler = exports.setGlobalErrorHandler = void 0;
const logging_error_handler_1 = require("./logging-error-handler");
/** The global error handler delegate */
let delegateHandler = (0, logging_error_handler_1.loggingErrorHandler)();
/**
 * Set the global error handler
 * @param {ErrorHandler} handler
 */
function setGlobalErrorHandler(handler) {
    delegateHandler = handler;
}
exports.setGlobalErrorHandler = setGlobalErrorHandler;
/**
 * Return the global error handler
 * @param {Exception} ex
 */
function globalErrorHandler(ex) {
    try {
        delegateHandler(ex);
    }
    catch { } // eslint-disable-line no-empty
}
exports.globalErrorHandler = globalErrorHandler;
//# sourceMappingURL=global-error-handler.js.map