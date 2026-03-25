"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyBrowserHttpOptions = void 0;
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
const otlp_http_configuration_1 = require("./otlp-http-configuration");
const shared_configuration_1 = require("./shared-configuration");
/**
 * @deprecated this will be removed in 2.0
 *
 * @param config
 * @param signalResourcePath
 * @param requiredHeaders
 */
function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return (0, otlp_http_configuration_1.mergeOtlpHttpConfigurationWithDefaults)({
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: (0, shared_configuration_1.wrapStaticHeadersInFunction)(config.headers),
        concurrencyLimit: config.concurrencyLimit,
    }, {}, // no fallback for browser case
    (0, otlp_http_configuration_1.getHttpConfigurationDefaults)(requiredHeaders, signalResourcePath));
}
exports.convertLegacyBrowserHttpOptions = convertLegacyBrowserHttpOptions;
//# sourceMappingURL=convert-legacy-browser-http-options.js.map