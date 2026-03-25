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
export function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) {
        return timeoutMillis;
    }
    throw new Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`);
}
export function wrapStaticHeadersInFunction(headers) {
    if (headers == null) {
        return undefined;
    }
    return () => headers;
}
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
export function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
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
export function getSharedConfigurationDefaults() {
    return {
        timeoutMillis: 10000,
        concurrencyLimit: 30,
        compression: 'none',
    };
}
//# sourceMappingURL=shared-configuration.js.map