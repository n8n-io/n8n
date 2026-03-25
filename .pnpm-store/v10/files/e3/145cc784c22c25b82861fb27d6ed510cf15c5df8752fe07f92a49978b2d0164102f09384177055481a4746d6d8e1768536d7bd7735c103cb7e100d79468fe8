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
exports.ProxyLogger = void 0;
const NoopLogger_1 = require("./NoopLogger");
class ProxyLogger {
    constructor(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
    }
    /**
     * Emit a log record. This method should only be used by log appenders.
     *
     * @param logRecord
     */
    emit(logRecord) {
        this._getLogger().emit(logRecord);
    }
    /**
     * Try to get a logger from the proxy logger provider.
     * If the proxy logger provider has no delegate, return a noop logger.
     */
    _getLogger() {
        if (this._delegate) {
            return this._delegate;
        }
        const logger = this._provider._getDelegateLogger(this.name, this.version, this.options);
        if (!logger) {
            return NoopLogger_1.NOOP_LOGGER;
        }
        this._delegate = logger;
        return this._delegate;
    }
}
exports.ProxyLogger = ProxyLogger;
//# sourceMappingURL=ProxyLogger.js.map