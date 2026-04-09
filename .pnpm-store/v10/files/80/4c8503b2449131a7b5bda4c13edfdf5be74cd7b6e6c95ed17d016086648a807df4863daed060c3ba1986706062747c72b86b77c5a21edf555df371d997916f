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
import { diag } from '@opentelemetry/api';
import { getEnv } from '@opentelemetry/core';
const DEFAULT_TRACE_TIMEOUT = 10000;
export const DEFAULT_EXPORT_MAX_ATTEMPTS = 5;
export const DEFAULT_EXPORT_INITIAL_BACKOFF = 1000;
export const DEFAULT_EXPORT_MAX_BACKOFF = 5000;
export const DEFAULT_EXPORT_BACKOFF_MULTIPLIER = 1.5;
/**
 * Parses headers from config leaving only those that have defined values
 * @param partialHeaders
 */
export function parseHeaders(partialHeaders = {}) {
    const headers = {};
    Object.entries(partialHeaders).forEach(([key, value]) => {
        if (typeof value !== 'undefined') {
            headers[key] = String(value);
        }
        else {
            diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
        }
    });
    return headers;
}
/**
 * Adds path (version + signal) to a no per-signal endpoint
 * @param url
 * @param path
 * @returns url + path
 */
export function appendResourcePathToUrl(url, path) {
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    return url + path;
}
/**
 * Adds root path to signal specific endpoint when endpoint contains no path part and no root path
 * @param url
 * @returns url
 */
export function appendRootPathToUrlIfNeeded(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '') {
            parsedUrl.pathname = parsedUrl.pathname + '/';
        }
        return parsedUrl.toString();
    }
    catch (_a) {
        diag.warn(`Could not parse export URL: '${url}'`);
        return url;
    }
}
/**
 * Configure exporter trace timeout value from passed in value or environment variables
 * @param timeoutMillis
 * @returns timeout value in milliseconds
 */
export function configureExporterTimeout(timeoutMillis) {
    if (typeof timeoutMillis === 'number') {
        if (timeoutMillis <= 0) {
            // OTLP exporter configured timeout - using default value of 10000ms
            return invalidTimeout(timeoutMillis, DEFAULT_TRACE_TIMEOUT);
        }
        return timeoutMillis;
    }
    else {
        return getExporterTimeoutFromEnv();
    }
}
function getExporterTimeoutFromEnv() {
    var _a;
    const definedTimeout = Number((_a = getEnv().OTEL_EXPORTER_OTLP_TRACES_TIMEOUT) !== null && _a !== void 0 ? _a : getEnv().OTEL_EXPORTER_OTLP_TIMEOUT);
    if (definedTimeout <= 0) {
        // OTLP exporter configured timeout - using default value of 10000ms
        return invalidTimeout(definedTimeout, DEFAULT_TRACE_TIMEOUT);
    }
    else {
        return definedTimeout;
    }
}
// OTLP exporter configured timeout - using default value of 10000ms
export function invalidTimeout(timeout, defaultTimeout) {
    diag.warn('Timeout must be greater than 0', timeout);
    return defaultTimeout;
}
export function isExportRetryable(statusCode) {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
}
export function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
        return -1;
    }
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
        return seconds > 0 ? seconds * 1000 : -1;
    }
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After#directives
    const delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
        return delay;
    }
    return 0;
}
//# sourceMappingURL=util.js.map