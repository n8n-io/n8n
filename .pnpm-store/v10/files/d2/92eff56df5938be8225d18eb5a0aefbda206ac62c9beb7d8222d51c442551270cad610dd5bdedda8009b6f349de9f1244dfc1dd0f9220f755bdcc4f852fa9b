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
import { getHttpConfigurationDefaults, mergeOtlpHttpConfigurationWithDefaults, } from './otlp-http-configuration';
import { wrapStaticHeadersInFunction } from './shared-configuration';
/**
 * @deprecated this will be removed in 2.0
 *
 * @param config
 * @param signalResourcePath
 * @param requiredHeaders
 */
export function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return mergeOtlpHttpConfigurationWithDefaults({
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: wrapStaticHeadersInFunction(config.headers),
        concurrencyLimit: config.concurrencyLimit,
    }, {}, // no fallback for browser case
    getHttpConfigurationDefaults(requiredHeaders, signalResourcePath));
}
//# sourceMappingURL=convert-legacy-browser-http-options.js.map