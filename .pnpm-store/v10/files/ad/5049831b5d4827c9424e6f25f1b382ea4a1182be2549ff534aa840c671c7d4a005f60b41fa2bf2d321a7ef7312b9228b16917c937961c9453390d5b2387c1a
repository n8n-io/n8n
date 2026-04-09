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
exports.parseRetryAfterToMills = exports.isExportRetryable = exports.invalidTimeout = exports.configureExporterTimeout = exports.appendRootPathToUrlIfNeeded = exports.appendResourcePathToUrl = exports.parseHeaders = exports.DEFAULT_EXPORT_BACKOFF_MULTIPLIER = exports.DEFAULT_EXPORT_MAX_BACKOFF = exports.DEFAULT_EXPORT_INITIAL_BACKOFF = exports.DEFAULT_EXPORT_MAX_ATTEMPTS = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const DEFAULT_TRACE_TIMEOUT = 10000;
exports.DEFAULT_EXPORT_MAX_ATTEMPTS = 5;
exports.DEFAULT_EXPORT_INITIAL_BACKOFF = 1000;
exports.DEFAULT_EXPORT_MAX_BACKOFF = 5000;
exports.DEFAULT_EXPORT_BACKOFF_MULTIPLIER = 1.5;
/**
 * Parses headers from config leaving only those that have defined values
 * @param partialHeaders
 */
function parseHeaders(partialHeaders = {}) {
    const headers = {};
    Object.entries(partialHeaders).forEach(([key, value]) => {
        if (typeof value !== 'undefined') {
            headers[key] = String(value);
        }
        else {
            api_1.diag.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
        }
    });
    return headers;
}
exports.parseHeaders = parseHeaders;
/**
 * Adds path (version + signal) to a no per-signal endpoint
 * @param url
 * @param path
 * @returns url + path
 */
function appendResourcePathToUrl(url, path) {
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    return url + path;
}
exports.appendResourcePathToUrl = appendResourcePathToUrl;
/**
 * Adds root path to signal specific endpoint when endpoint contains no path part and no root path
 * @param url
 * @returns url
 */
function appendRootPathToUrlIfNeeded(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '') {
            parsedUrl.pathname = parsedUrl.pathname + '/';
        }
        return parsedUrl.toString();
    }
    catch (_a) {
        api_1.diag.warn(`Could not parse export URL: '${url}'`);
        return url;
    }
}
exports.appendRootPathToUrlIfNeeded = appendRootPathToUrlIfNeeded;
/**
 * Configure exporter trace timeout value from passed in value or environment variables
 * @param timeoutMillis
 * @returns timeout value in milliseconds
 */
function configureExporterTimeout(timeoutMillis) {
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
exports.configureExporterTimeout = configureExporterTimeout;
function getExporterTimeoutFromEnv() {
    var _a;
    const definedTimeout = Number((_a = (0, core_1.getEnv)().OTEL_EXPORTER_OTLP_TRACES_TIMEOUT) !== null && _a !== void 0 ? _a : (0, core_1.getEnv)().OTEL_EXPORTER_OTLP_TIMEOUT);
    if (definedTimeout <= 0) {
        // OTLP exporter configured timeout - using default value of 10000ms
        return invalidTimeout(definedTimeout, DEFAULT_TRACE_TIMEOUT);
    }
    else {
        return definedTimeout;
    }
}
// OTLP exporter configured timeout - using default value of 10000ms
function invalidTimeout(timeout, defaultTimeout) {
    api_1.diag.warn('Timeout must be greater than 0', timeout);
    return defaultTimeout;
}
exports.invalidTimeout = invalidTimeout;
function isExportRetryable(statusCode) {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
}
exports.isExportRetryable = isExportRetryable;
function parseRetryAfterToMills(retryAfter) {
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
exports.parseRetryAfterToMills = parseRetryAfterToMills;
//# sourceMappingURL=util.js.map