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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { isExportRetryable, parseRetryAfterToMills } from '../../util';
import { diag } from '@opentelemetry/api';
var XhrTransport = /** @class */ (function () {
    function XhrTransport(_parameters) {
        this._parameters = _parameters;
    }
    XhrTransport.prototype.send = function (data, timeoutMillis) {
        var _this = this;
        return new Promise(function (resolve) {
            var xhr = new XMLHttpRequest();
            xhr.timeout = timeoutMillis;
            xhr.open('POST', _this._parameters.url);
            Object.entries(_this._parameters.headers).forEach(function (_a) {
                var _b = __read(_a, 2), k = _b[0], v = _b[1];
                xhr.setRequestHeader(k, v);
            });
            xhr.ontimeout = function (_) {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request timed out'),
                });
            };
            xhr.onreadystatechange = function () {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    diag.debug('XHR success');
                    resolve({
                        status: 'success',
                    });
                }
                else if (xhr.status && isExportRetryable(xhr.status)) {
                    resolve({
                        status: 'retryable',
                        retryInMillis: parseRetryAfterToMills(xhr.getResponseHeader('Retry-After')),
                    });
                }
                else if (xhr.status !== 0) {
                    resolve({
                        status: 'failure',
                        error: new Error('XHR request failed with non-retryable status'),
                    });
                }
            };
            xhr.onabort = function () {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request aborted'),
                });
            };
            xhr.onerror = function () {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request errored'),
                });
            };
            xhr.send(new Blob([data], { type: _this._parameters.headers['Content-Type'] }));
        });
    };
    XhrTransport.prototype.shutdown = function () {
        // Intentionally left empty, nothing to do.
    };
    return XhrTransport;
}());
/**
 * Creates an exporter transport that uses XHR to send the data
 * @param parameters applied to each request made by transport
 */
export function createXhrTransport(parameters) {
    return new XhrTransport(parameters);
}
//# sourceMappingURL=xhr-transport.js.map