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
exports.OTLPTraceExporter = void 0;
const core_1 = require("@opentelemetry/core");
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const otlp_exporter_base_2 = require("@opentelemetry/otlp-exporter-base");
const version_1 = require("../../version");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318/${DEFAULT_COLLECTOR_RESOURCE_PATH}`;
const USER_AGENT = {
    'User-Agent': `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`,
};
/**
 * Collector Trace Exporter for Node
 */
class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterNodeBase {
    constructor(config = {}) {
        super(config, otlp_transformer_1.JsonTraceSerializer, Object.assign(Object.assign(Object.assign(Object.assign({}, core_1.baggageUtils.parseKeyPairsIntoRecord((0, core_1.getEnv)().OTEL_EXPORTER_OTLP_TRACES_HEADERS)), (0, otlp_exporter_base_1.parseHeaders)(config === null || config === void 0 ? void 0 : config.headers)), USER_AGENT), { 'Content-Type': 'application/json' }));
    }
    getDefaultUrl(config) {
        if (typeof config.url === 'string') {
            return config.url;
        }
        const env = (0, core_1.getEnv)();
        if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT.length > 0) {
            return (0, otlp_exporter_base_2.appendRootPathToUrlIfNeeded)(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
        }
        if (env.OTEL_EXPORTER_OTLP_ENDPOINT.length > 0) {
            return (0, otlp_exporter_base_2.appendResourcePathToUrl)(env.OTEL_EXPORTER_OTLP_ENDPOINT, DEFAULT_COLLECTOR_RESOURCE_PATH);
        }
        return DEFAULT_COLLECTOR_URL;
    }
}
exports.OTLPTraceExporter = OTLPTraceExporter;
//# sourceMappingURL=OTLPTraceExporter.js.map