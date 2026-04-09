"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedConfigurationDefaults = exports.mergeOtlpSharedConfigurationWithDefaults = exports.wrapStaticHeadersInFunction = exports.validateTimeoutMillis = void 0;
function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) {
        return timeoutMillis;
    }
    throw new Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`);
}
exports.validateTimeoutMillis = validateTimeoutMillis;
function wrapStaticHeadersInFunction(headers) {
    if (headers == null) {
        return undefined;
    }
    return async () => headers;
}
exports.wrapStaticHeadersInFunction = wrapStaticHeadersInFunction;
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
        timeoutMillis: validateTimeoutMillis(userProvidedConfiguration.timeoutMillis ??
            fallbackConfiguration.timeoutMillis ??
            defaultConfiguration.timeoutMillis),
        concurrencyLimit: userProvidedConfiguration.concurrencyLimit ??
            fallbackConfiguration.concurrencyLimit ??
            defaultConfiguration.concurrencyLimit,
        compression: userProvidedConfiguration.compression ??
            fallbackConfiguration.compression ??
            defaultConfiguration.compression,
    };
}
exports.mergeOtlpSharedConfigurationWithDefaults = mergeOtlpSharedConfigurationWithDefaults;
function getSharedConfigurationDefaults() {
    return {
        timeoutMillis: 10000,
        concurrencyLimit: 30,
        compression: 'none',
    };
}
exports.getSharedConfigurationDefaults = getSharedConfigurationDefaults;
//# sourceMappingURL=shared-configuration.js.map