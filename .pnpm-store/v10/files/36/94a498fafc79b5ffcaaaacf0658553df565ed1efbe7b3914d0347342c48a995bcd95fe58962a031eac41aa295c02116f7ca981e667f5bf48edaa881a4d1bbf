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
const http_transport_utils_1 = require("./http-transport-utils");
class HttpExporterTransport {
    _parameters;
    _utils = null;
    constructor(_parameters) {
        this._parameters = _parameters;
    }
    async send(data, timeoutMillis) {
        const { agent, request } = await this._loadUtils();
        return new Promise(resolve => {
            (0, http_transport_utils_1.sendWithHttp)(request, this._parameters, agent, data, result => {
                resolve(result);
            }, timeoutMillis);
        });
    }
    shutdown() {
        // intentionally left empty, nothing to do.
    }
    async _loadUtils() {
        let utils = this._utils;
        if (utils === null) {
            const protocol = new URL(this._parameters.url).protocol;
            const [agent, request] = await Promise.all([
                this._parameters.agentFactory(protocol),
                requestFunctionFactory(protocol),
            ]);
            utils = this._utils = { agent, request };
        }
        return utils;
    }
}
async function requestFunctionFactory(protocol) {
    const module = protocol === 'http:' ? import('http') : import('https');
    const { request } = await module;
    return request;
}
function createHttpExporterTransport(parameters) {
    return new HttpExporterTransport(parameters);
}
exports.createHttpExporterTransport = createHttpExporterTransport;
//# sourceMappingURL=http-exporter-transport.js.map