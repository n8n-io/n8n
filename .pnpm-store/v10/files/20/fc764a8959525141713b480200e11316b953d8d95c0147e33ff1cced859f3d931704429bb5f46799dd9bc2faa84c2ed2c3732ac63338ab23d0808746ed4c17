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
import { API_BACKWARDS_COMPATIBILITY_VERSION, GLOBAL_LOGS_API_KEY, _global, makeGetter, } from '../internal/global-utils';
import { NOOP_LOGGER_PROVIDER } from '../NoopLoggerProvider';
var LogsAPI = /** @class */ (function () {
    function LogsAPI() {
    }
    LogsAPI.getInstance = function () {
        if (!this._instance) {
            this._instance = new LogsAPI();
        }
        return this._instance;
    };
    LogsAPI.prototype.setGlobalLoggerProvider = function (provider) {
        if (_global[GLOBAL_LOGS_API_KEY]) {
            return this.getLoggerProvider();
        }
        _global[GLOBAL_LOGS_API_KEY] = makeGetter(API_BACKWARDS_COMPATIBILITY_VERSION, provider, NOOP_LOGGER_PROVIDER);
        return provider;
    };
    /**
     * Returns the global logger provider.
     *
     * @returns LoggerProvider
     */
    LogsAPI.prototype.getLoggerProvider = function () {
        var _a, _b;
        return ((_b = (_a = _global[GLOBAL_LOGS_API_KEY]) === null || _a === void 0 ? void 0 : _a.call(_global, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : NOOP_LOGGER_PROVIDER);
    };
    /**
     * Returns a logger from the global logger provider.
     *
     * @returns Logger
     */
    LogsAPI.prototype.getLogger = function (name, version, options) {
        return this.getLoggerProvider().getLogger(name, version, options);
    };
    /** Remove the global logger provider */
    LogsAPI.prototype.disable = function () {
        delete _global[GLOBAL_LOGS_API_KEY];
    };
    return LogsAPI;
}());
export { LogsAPI };
//# sourceMappingURL=logs.js.map