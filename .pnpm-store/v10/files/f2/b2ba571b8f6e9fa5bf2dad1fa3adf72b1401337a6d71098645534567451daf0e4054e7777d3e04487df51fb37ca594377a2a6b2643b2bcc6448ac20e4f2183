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
exports.createHttpExporterTransport = void 0;
class HttpExporterTransport {
    constructor(_parameters) {
        this._parameters = _parameters;
        this._send = null;
        this._agent = null;
    }
    async send(data, timeoutMillis) {
        if (this._send == null) {
            // Lazy require to ensure that http/https is not required before instrumentations can wrap it.
            const { sendWithHttp, createHttpAgent,
            // eslint-disable-next-line @typescript-eslint/no-var-requires
             } = require('./http-transport-utils');
            this._agent = createHttpAgent(this._parameters.url, this._parameters.agentOptions);
            this._send = sendWithHttp;
        }
        return new Promise(resolve => {
            var _a;
            // this will always be defined
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            (_a = this._send) === null || _a === void 0 ? void 0 : _a.call(this, this._parameters, this._agent, data, result => {
                resolve(result);
            }, timeoutMillis);
        });
    }
    shutdown() {
        // intentionally left empty, nothing to do.
    }
}
function createHttpExporterTransport(parameters) {
    return new HttpExporterTransport(parameters);
}
exports.createHttpExporterTransport = createHttpExporterTransport;
//# sourceMappingURL=http-exporter-transport.js.map