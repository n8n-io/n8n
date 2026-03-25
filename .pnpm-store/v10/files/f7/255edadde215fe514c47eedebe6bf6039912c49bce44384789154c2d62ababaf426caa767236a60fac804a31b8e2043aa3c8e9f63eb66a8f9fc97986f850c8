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
exports.ProxyLoggerProvider = void 0;
const NoopLoggerProvider_1 = require("./NoopLoggerProvider");
const ProxyLogger_1 = require("./ProxyLogger");
class ProxyLoggerProvider {
    getLogger(name, version, options) {
        var _a;
        return ((_a = this._getDelegateLogger(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger_1.ProxyLogger(this, name, version, options));
    }
    /**
     * Get the delegate logger provider.
     * Used by tests only.
     * @internal
     */
    _getDelegate() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NoopLoggerProvider_1.NOOP_LOGGER_PROVIDER;
    }
    /**
     * Set the delegate logger provider
     * @internal
     */
    _setDelegate(delegate) {
        this._delegate = delegate;
    }
    /**
     * @internal
     */
    _getDelegateLogger(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name, version, options);
    }
}
exports.ProxyLoggerProvider = ProxyLoggerProvider;
//# sourceMappingURL=ProxyLoggerProvider.js.map