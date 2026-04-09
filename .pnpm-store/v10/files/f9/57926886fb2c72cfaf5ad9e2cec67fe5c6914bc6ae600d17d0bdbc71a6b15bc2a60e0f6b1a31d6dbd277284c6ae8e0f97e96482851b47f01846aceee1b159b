/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { sendWithHttp } from './http-transport-utils';
class HttpExporterTransport {
    _utils = null;
    _parameters;
    constructor(parameters) {
        this._parameters = parameters;
    }
    async send(data, timeoutMillis) {
        const { agent, request } = await this._loadUtils();
        const headers = await this._parameters.headers();
        return sendWithHttp(request, this._parameters.url, headers, this._parameters.compression, this._parameters.userAgent, agent, data, timeoutMillis);
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
export function createHttpExporterTransport(parameters) {
    return new HttpExporterTransport(parameters);
}
//# sourceMappingURL=http-exporter-transport.js.map