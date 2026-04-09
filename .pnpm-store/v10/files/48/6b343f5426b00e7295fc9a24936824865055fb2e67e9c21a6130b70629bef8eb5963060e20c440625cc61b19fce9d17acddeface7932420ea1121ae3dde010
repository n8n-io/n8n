"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpConfigurationDefaults = exports.mergeOtlpHttpConfigurationWithDefaults = void 0;
const shared_configuration_1 = require("./shared-configuration");
const util_1 = require("../util");
function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    return async () => {
        const requiredHeaders = {
            ...(await defaultHeaders()),
        };
        const headers = {};
        // add fallback ones first
        if (fallbackHeaders != null) {
            Object.assign(headers, await fallbackHeaders());
        }
        // override with user-provided ones
        if (userProvidedHeaders != null) {
            Object.assign(headers, (0, util_1.validateAndNormalizeHeaders)(await userProvidedHeaders()));
        }
        // override required ones.
        return Object.assign(headers, requiredHeaders);
    };
}
function validateUserProvidedUrl(url) {
    if (url == null) {
        return undefined;
    }
    try {
        // NOTE: In non-browser environments, `globalThis.location` will be `undefined`.
        const base = globalThis.location?.href;
        return new URL(url, base).href;
    }
    catch {
        throw new Error(`Configuration: Could not parse user-provided export URL: '${url}'`);
    }
}
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
        ...(0, shared_configuration_1.mergeOtlpSharedConfigurationWithDefaults)(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
        headers: mergeHeaders(userProvidedConfiguration.headers, fallbackConfiguration.headers, defaultConfiguration.headers),
        url: validateUserProvidedUrl(userProvidedConfiguration.url) ??
            fallbackConfiguration.url ??
            defaultConfiguration.url,
    };
}
exports.mergeOtlpHttpConfigurationWithDefaults = mergeOtlpHttpConfigurationWithDefaults;
function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
        ...(0, shared_configuration_1.getSharedConfigurationDefaults)(),
        headers: async () => requiredHeaders,
        url: 'http://localhost:4318/' + signalResourcePath,
    };
}
exports.getHttpConfigurationDefaults = getHttpConfigurationDefaults;
//# sourceMappingURL=otlp-http-configuration.js.map