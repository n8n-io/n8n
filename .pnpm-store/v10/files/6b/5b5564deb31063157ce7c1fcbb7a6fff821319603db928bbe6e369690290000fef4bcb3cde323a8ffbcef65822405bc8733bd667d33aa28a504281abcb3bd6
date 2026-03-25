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
exports.getOtlpGrpcDefaultConfiguration = exports.mergeOtlpGrpcConfigurationWithDefaults = exports.validateAndNormalizeUrl = void 0;
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const grpc_exporter_transport_1 = require("../grpc-exporter-transport");
const version_1 = require("../version");
const url_1 = require("url");
const api_1 = require("@opentelemetry/api");
function validateAndNormalizeUrl(url) {
    url = url.trim();
    const hasProtocol = url.match(/^([\w]{1,8}):\/\//);
    if (!hasProtocol) {
        url = `https://${url}`;
    }
    const target = new url_1.URL(url);
    if (target.protocol === 'unix:') {
        return url;
    }
    if (target.pathname && target.pathname !== '/') {
        api_1.diag.warn('URL path should not be set when using grpc, the path part of the URL will be ignored.');
    }
    if (target.protocol !== '' && !target.protocol?.match(/^(http)s?:$/)) {
        api_1.diag.warn('URL protocol should be http(s)://. Using http://.');
    }
    return target.host;
}
exports.validateAndNormalizeUrl = validateAndNormalizeUrl;
function overrideMetadataEntriesIfNotPresent(metadata, additionalMetadata) {
    for (const [key, value] of Object.entries(additionalMetadata.getMap())) {
        // only override with env var data if the key has no values.
        // not using Metadata.merge() as it will keep both values.
        if (metadata.get(key).length < 1) {
            metadata.set(key, value);
        }
    }
}
function mergeOtlpGrpcConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    const rawUrl = userProvidedConfiguration.url ??
        fallbackConfiguration.url ??
        defaultConfiguration.url;
    return {
        ...(0, otlp_exporter_base_1.mergeOtlpSharedConfigurationWithDefaults)(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
        metadata: () => {
            const metadata = defaultConfiguration.metadata();
            overrideMetadataEntriesIfNotPresent(metadata, 
            // clone to ensure we don't modify what the user gave us in case they hold on to the returned reference
            userProvidedConfiguration.metadata?.().clone() ?? (0, grpc_exporter_transport_1.createEmptyMetadata)());
            overrideMetadataEntriesIfNotPresent(metadata, fallbackConfiguration.metadata?.() ?? (0, grpc_exporter_transport_1.createEmptyMetadata)());
            return metadata;
        },
        url: validateAndNormalizeUrl(rawUrl),
        credentials: userProvidedConfiguration.credentials ??
            fallbackConfiguration.credentials?.(rawUrl) ??
            defaultConfiguration.credentials(rawUrl),
    };
}
exports.mergeOtlpGrpcConfigurationWithDefaults = mergeOtlpGrpcConfigurationWithDefaults;
function getOtlpGrpcDefaultConfiguration() {
    return {
        ...(0, otlp_exporter_base_1.getSharedConfigurationDefaults)(),
        metadata: () => {
            const metadata = (0, grpc_exporter_transport_1.createEmptyMetadata)();
            metadata.set('User-Agent', `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`);
            return metadata;
        },
        url: 'http://localhost:4317',
        credentials: (url) => {
            if (url.startsWith('http://')) {
                return () => (0, grpc_exporter_transport_1.createInsecureCredentials)();
            }
            else {
                return () => (0, grpc_exporter_transport_1.createSslCredentials)();
            }
        },
    };
}
exports.getOtlpGrpcDefaultConfiguration = getOtlpGrpcDefaultConfiguration;
//# sourceMappingURL=otlp-grpc-configuration.js.map