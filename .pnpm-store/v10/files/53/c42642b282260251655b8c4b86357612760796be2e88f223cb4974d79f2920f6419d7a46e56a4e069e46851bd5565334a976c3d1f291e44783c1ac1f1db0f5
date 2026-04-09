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
exports.createXhrTransport = void 0;
const util_1 = require("../../util");
const api_1 = require("@opentelemetry/api");
class XhrTransport {
    constructor(_parameters) {
        this._parameters = _parameters;
    }
    send(data, timeoutMillis) {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = timeoutMillis;
            xhr.open('POST', this._parameters.url);
            Object.entries(this._parameters.headers).forEach(([k, v]) => {
                xhr.setRequestHeader(k, v);
            });
            xhr.ontimeout = _ => {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request timed out'),
                });
            };
            xhr.onreadystatechange = () => {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    api_1.diag.debug('XHR success');
                    resolve({
                        status: 'success',
                    });
                }
                else if (xhr.status && (0, util_1.isExportRetryable)(xhr.status)) {
                    resolve({
                        status: 'retryable',
                        retryInMillis: (0, util_1.parseRetryAfterToMills)(xhr.getResponseHeader('Retry-After')),
                    });
                }
                else if (xhr.status !== 0) {
                    resolve({
                        status: 'failure',
                        error: new Error('XHR request failed with non-retryable status'),
                    });
                }
            };
            xhr.onabort = () => {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request aborted'),
                });
            };
            xhr.onerror = () => {
                resolve({
                    status: 'failure',
                    error: new Error('XHR request errored'),
                });
            };
            xhr.send(new Blob([data], { type: this._parameters.headers['Content-Type'] }));
        });
    }
    shutdown() {
        // Intentionally left empty, nothing to do.
    }
}
/**
 * Creates an exporter transport that uses XHR to send the data
 * @param parameters applied to each request made by transport
 */
function createXhrTransport(parameters) {
    return new XhrTransport(parameters);
}
exports.createXhrTransport = createXhrTransport;
//# sourceMappingURL=xhr-transport.js.map