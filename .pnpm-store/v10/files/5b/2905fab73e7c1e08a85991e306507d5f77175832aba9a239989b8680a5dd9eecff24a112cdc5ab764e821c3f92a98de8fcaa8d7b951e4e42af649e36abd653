"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetryingTransport = void 0;
const api_1 = require("@opentelemetry/api");
const MAX_ATTEMPTS = 5;
const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 5000;
const BACKOFF_MULTIPLIER = 1.5;
const JITTER = 0.2;
/**
 * Get a pseudo-random jitter that falls in the range of [-JITTER, +JITTER]
 */
function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
}
class RetryingTransport {
    _transport;
    constructor(transport) {
        this._transport = transport;
    }
    retry(data, timeoutMillis, inMillis) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this._transport.send(data, timeoutMillis).then(resolve, reject);
            }, inMillis);
        });
    }
    async send(data, timeoutMillis) {
        let attempts = MAX_ATTEMPTS;
        let nextBackoff = INITIAL_BACKOFF;
        const deadline = Date.now() + timeoutMillis;
        let result = await this._transport.send(data, timeoutMillis);
        while (result.status === 'retryable' && attempts > 0) {
            attempts--;
            // use maximum of computed backoff and 0 to avoid negative timeouts
            const backoff = Math.max(Math.min(nextBackoff * (1 + getJitter()), MAX_BACKOFF), 0);
            nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
            const retryInMillis = result.retryInMillis ?? backoff;
            // return when expected retry time is after the export deadline.
            const remainingTimeoutMillis = deadline - Date.now();
            if (retryInMillis > remainingTimeoutMillis) {
                api_1.diag.info(`Export retry time ${Math.round(retryInMillis)}ms exceeds remaining timeout ${Math.round(remainingTimeoutMillis)}ms, not retrying further.`);
                return result;
            }
            api_1.diag.verbose(`Scheduling export retry in ${Math.round(retryInMillis)}ms`);
            result = await this.retry(data, remainingTimeoutMillis, retryInMillis);
        }
        if (result.status === 'success') {
            api_1.diag.verbose(`Export succeeded after ${MAX_ATTEMPTS - attempts} retry attempts.`);
        }
        else if (result.status === 'retryable') {
            api_1.diag.info(`Export failed after maximum retry attempts (${MAX_ATTEMPTS}).`);
        }
        else {
            api_1.diag.info(`Export failed with non-retryable error: ${result.error}`);
        }
        return result;
    }
    shutdown() {
        return this._transport.shutdown();
    }
}
/**
 * Creates an Exporter Transport that retries on 'retryable' response.
 */
function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
}
exports.createRetryingTransport = createRetryingTransport;
//# sourceMappingURL=retrying-transport.js.map