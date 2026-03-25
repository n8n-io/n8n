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
import { getStringFromEnv, parseKeyPairsIntoRecord } from '@opentelemetry/core';
import { diag } from '@opentelemetry/api';
import { getSharedConfigurationFromEnvironment } from './shared-env-configuration';
import { wrapStaticHeadersInFunction } from './shared-configuration';
function getStaticHeadersFromEnv(signalIdentifier) {
    const signalSpecificRawHeaders = getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_HEADERS`);
    const nonSignalSpecificRawHeaders = getStringFromEnv('OTEL_EXPORTER_OTLP_HEADERS');
    const signalSpecificHeaders = parseKeyPairsIntoRecord(signalSpecificRawHeaders);
    const nonSignalSpecificHeaders = parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders);
    if (Object.keys(signalSpecificHeaders).length === 0 &&
        Object.keys(nonSignalSpecificHeaders).length === 0) {
        return undefined;
    }
    // headers are combined instead of overwritten, with the specific headers taking precedence over
    // the non-specific ones.
    return Object.assign({}, parseKeyPairsIntoRecord(nonSignalSpecificRawHeaders), parseKeyPairsIntoRecord(signalSpecificRawHeaders));
}
function appendRootPathToUrlIfNeeded(url) {
    try {
        const parsedUrl = new URL(url);
        // This will automatically append '/' if there's no root path.
        return parsedUrl.toString();
    }
    catch {
        diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
        return undefined;
    }
}
function appendResourcePathToUrl(url, path) {
    try {
        // just try to parse, if it fails we catch and warn.
        new URL(url);
    }
    catch {
        diag.warn(`Configuration: Could not parse environment-provided export URL: '${url}', falling back to undefined`);
        return undefined;
    }
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    url += path;
    try {
        // just try to parse, if it fails we catch and warn.
        new URL(url);
    }
    catch {
        diag.warn(`Configuration: Provided URL appended with '${path}' is not a valid URL, using 'undefined' instead of '${url}'`);
        return undefined;
    }
    return url;
}
function getNonSpecificUrlFromEnv(signalResourcePath) {
    const envUrl = getStringFromEnv('OTEL_EXPORTER_OTLP_ENDPOINT');
    if (envUrl === undefined) {
        return undefined;
    }
    return appendResourcePathToUrl(envUrl, signalResourcePath);
}
function getSpecificUrlFromEnv(signalIdentifier) {
    const envUrl = getStringFromEnv(`OTEL_EXPORTER_OTLP_${signalIdentifier}_ENDPOINT`);
    if (envUrl === undefined) {
        return undefined;
    }
    return appendRootPathToUrlIfNeeded(envUrl);
}
/**
 * Reads and returns configuration from the environment
 *
 * @param signalIdentifier all caps part in environment variables that identifies the signal (e.g.: METRICS, TRACES, LOGS)
 * @param signalResourcePath signal resource path to append if necessary (e.g.: v1/metrics, v1/traces, v1/logs)
 */
export function getHttpConfigurationFromEnvironment(signalIdentifier, signalResourcePath) {
    return {
        ...getSharedConfigurationFromEnvironment(signalIdentifier),
        url: getSpecificUrlFromEnv(signalIdentifier) ??
            getNonSpecificUrlFromEnv(signalResourcePath),
        headers: wrapStaticHeadersInFunction(getStaticHeadersFromEnv(signalIdentifier)),
    };
}
//# sourceMappingURL=otlp-http-env-configuration.js.map