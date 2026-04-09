"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFetchTransport = void 0;
const api_1 = require("@opentelemetry/api");
const is_export_retryable_1 = require("../is-export-retryable");
/**
 * Maximum total body size for concurrent keepalive requests.
 * Browsers enforce a 64KiB cumulative limit across all pending keepalive requests.
 * We use 60KB to leave headroom for headers.
 * @see https://github.com/whatwg/fetch/issues/679
 * @see https://blog.huli.tw/2025/01/06/en/navigator-sendbeacon-64kib-and-source-code/
 */
const MAX_KEEPALIVE_BODY_SIZE = 60 * 1024;
/**
 * Maximum concurrent keepalive requests.
 * Chrome enforces 9 concurrent keepalive fetch requests per renderer process.
 * @see https://github.com/whatwg/fetch/issues/679
 * Quote: "If the renderer process is processing more than 9 requests with keepalive set, we reject a new request"
 */
const MAX_KEEPALIVE_REQUESTS = 9;
/**
 * Track cumulative pending body size across all in-flight keepalive requests.
 * This is necessary because the 64KiB limit is cumulative, not per-request.
 */
let pendingBodySize = 0;
/**
 * Track number of pending keepalive requests.
 */
let pendingKeepaliveCount = 0;
class FetchTransport {
    _parameters;
    constructor(parameters) {
        this._parameters = parameters;
    }
    async send(data, timeoutMillis) {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), timeoutMillis);
        // Fetch API may be wrapped by an instrumentation like `@opentelemetry/instrumentation-fetch`.
        // In that case the instrumentation would create a new Span for this request
        // because the context manager cannot keep the context after `await` calls.
        // This creates an indirect endless loop Export -> Span -> Export
        // By using the `__original` function the instrumentation can't intercept the call
        // and no Span will be created breaking the vicious cycle
        let fetchApi = globalThis.fetch;
        // @ts-expect-error -- fetch could be wrapped
        if (typeof fetchApi.__original === 'function') {
            // @ts-expect-error -- fetch could be wrapped
            fetchApi = fetchApi.__original;
        }
        const requestSize = data.byteLength;
        // Determine if we can use keepalive based on cumulative browser limits.
        // We must check BEFORE adding to pending totals to avoid exceeding limits.
        const wouldExceedSize = pendingBodySize + requestSize > MAX_KEEPALIVE_BODY_SIZE;
        const wouldExceedCount = pendingKeepaliveCount >= MAX_KEEPALIVE_REQUESTS;
        const useKeepalive = !wouldExceedSize && !wouldExceedCount;
        if (useKeepalive) {
            pendingBodySize += requestSize;
            pendingKeepaliveCount++;
        }
        else {
            const reason = wouldExceedSize ? 'size limit' : 'count limit';
            api_1.diag.debug(`keepalive disabled: ${(requestSize / 1024).toFixed(1)}KB payload, ${pendingKeepaliveCount} pending (${reason})`);
        }
        try {
            const url = new URL(this._parameters.url);
            const response = await fetchApi(url.href, {
                method: 'POST',
                headers: await this._parameters.headers(),
                body: data,
                signal: abortController.signal,
                keepalive: useKeepalive,
                mode: globalThis.location
                    ? globalThis.location.origin === url.origin
                        ? 'same-origin'
                        : 'cors'
                    : 'no-cors',
            });
            if (response.status >= 200 && response.status <= 299) {
                api_1.diag.debug(`export response success (status: ${response.status})`);
                return { status: 'success' };
            }
            else if ((0, is_export_retryable_1.isExportHTTPErrorRetryable)(response.status)) {
                api_1.diag.warn(`export response retryable (status: ${response.status})`);
                const retryAfter = response.headers.get('Retry-After');
                const retryInMillis = (0, is_export_retryable_1.parseRetryAfterToMills)(retryAfter);
                return { status: 'retryable', retryInMillis };
            }
            api_1.diag.error(`export response failure (status: ${response.status})`);
            return {
                status: 'failure',
                error: new Error(`Fetch request failed with non-retryable status ${response.status}`),
            };
        }
        catch (error) {
            if (isFetchNetworkErrorRetryable(error)) {
                api_1.diag.warn(`export request retryable (network error: ${error})`);
                return {
                    status: 'retryable',
                    error: new Error('Fetch request encountered a network error', {
                        cause: error,
                    }),
                };
            }
            api_1.diag.error(`export request failure (error: ${error})`);
            return {
                status: 'failure',
                error: new Error('Fetch request errored', { cause: error }),
            };
        }
        finally {
            clearTimeout(timeout);
            if (useKeepalive) {
                pendingBodySize -= requestSize;
                pendingKeepaliveCount--;
            }
        }
    }
    shutdown() {
        // Intentionally left empty, nothing to do.
    }
}
/**
 * Creates an exporter transport that uses `fetch` to send the data
 * @param parameters applied to each request made by transport
 */
function createFetchTransport(parameters) {
    return new FetchTransport(parameters);
}
exports.createFetchTransport = createFetchTransport;
function isFetchNetworkErrorRetryable(error) {
    return error instanceof TypeError && !error.cause;
}
//# sourceMappingURL=fetch-transport.js.map