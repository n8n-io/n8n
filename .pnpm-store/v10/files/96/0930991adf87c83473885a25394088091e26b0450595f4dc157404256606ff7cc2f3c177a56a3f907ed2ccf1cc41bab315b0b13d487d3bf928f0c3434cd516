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
exports.registerInstrumentations = void 0;
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const autoLoaderUtils_1 = require("./autoLoaderUtils");
/**
 * It will register instrumentations and plugins
 * @param options
 * @return returns function to unload instrumentation and plugins that were
 *   registered
 */
function registerInstrumentations(options) {
    const tracerProvider = options.tracerProvider || api_1.trace.getTracerProvider();
    const meterProvider = options.meterProvider || api_1.metrics.getMeterProvider();
    const loggerProvider = options.loggerProvider || api_logs_1.logs.getLoggerProvider();
    const instrumentations = options.instrumentations?.flat() ?? [];
    (0, autoLoaderUtils_1.enableInstrumentations)(instrumentations, tracerProvider, meterProvider, loggerProvider);
    return () => {
        (0, autoLoaderUtils_1.disableInstrumentations)(instrumentations);
    };
}
exports.registerInstrumentations = registerInstrumentations;
//# sourceMappingURL=autoLoader.js.map