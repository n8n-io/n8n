/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { getSharedConfigurationDefaults, mergeOtlpSharedConfigurationWithDefaults, } from './shared-configuration';
import { validateAndNormalizeHeaders } from '../util';
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
            Object.assign(headers, validateAndNormalizeHeaders(await userProvidedHeaders()));
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
export function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
        ...mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
        headers: mergeHeaders(userProvidedConfiguration.headers, fallbackConfiguration.headers, defaultConfiguration.headers),
        url: validateUserProvidedUrl(userProvidedConfiguration.url) ??
            fallbackConfiguration.url ??
            defaultConfiguration.url,
    };
}
export function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
        ...getSharedConfigurationDefaults(),
        headers: async () => requiredHeaders,
        url: 'http://localhost:4318/' + signalResourcePath,
    };
}
//# sourceMappingURL=otlp-http-configuration.js.map