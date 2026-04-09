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
import { OTLPExporterBrowserBase, } from '@opentelemetry/otlp-exporter-base';
import { JsonTraceSerializer, } from '@opentelemetry/otlp-transformer';
const DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318/${DEFAULT_COLLECTOR_RESOURCE_PATH}`;
/**
 * Collector Trace Exporter for Web
 */
export class OTLPTraceExporter extends OTLPExporterBrowserBase {
    constructor(config = {}) {
        super(config, JsonTraceSerializer, `application/json`);
    }
    getDefaultUrl(config) {
        if (typeof config.url === 'string') {
            return config.url;
        }
        return DEFAULT_COLLECTOR_URL;
    }
}
//# sourceMappingURL=OTLPTraceExporter.js.map