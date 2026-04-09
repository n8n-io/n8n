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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { getEnv, baggageUtils } from '@opentelemetry/core';
import { OTLPExporterNodeBase, parseHeaders, } from '@opentelemetry/otlp-exporter-base';
import { appendResourcePathToUrl, appendRootPathToUrlIfNeeded, } from '@opentelemetry/otlp-exporter-base';
import { VERSION } from '../../version';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
var DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/traces';
var DEFAULT_COLLECTOR_URL = "http://localhost:4318/" + DEFAULT_COLLECTOR_RESOURCE_PATH;
var USER_AGENT = {
    'User-Agent': "OTel-OTLP-Exporter-JavaScript/" + VERSION,
};
/**
 * Collector Trace Exporter for Node
 */
var OTLPTraceExporter = /** @class */ (function (_super) {
    __extends(OTLPTraceExporter, _super);
    function OTLPTraceExporter(config) {
        if (config === void 0) { config = {}; }
        return _super.call(this, config, JsonTraceSerializer, __assign(__assign(__assign(__assign({}, baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_TRACES_HEADERS)), parseHeaders(config === null || config === void 0 ? void 0 : config.headers)), USER_AGENT), { 'Content-Type': 'application/json' })) || this;
    }
    OTLPTraceExporter.prototype.getDefaultUrl = function (config) {
        if (typeof config.url === 'string') {
            return config.url;
        }
        var env = getEnv();
        if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT.length > 0) {
            return appendRootPathToUrlIfNeeded(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
        }
        if (env.OTEL_EXPORTER_OTLP_ENDPOINT.length > 0) {
            return appendResourcePathToUrl(env.OTEL_EXPORTER_OTLP_ENDPOINT, DEFAULT_COLLECTOR_RESOURCE_PATH);
        }
        return DEFAULT_COLLECTOR_URL;
    };
    return OTLPTraceExporter;
}(OTLPExporterNodeBase));
export { OTLPTraceExporter };
//# sourceMappingURL=OTLPTraceExporter.js.map