/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import * as http from 'http';
import * as https from 'https';
/**
 * Prepares send function that will send spans to the remote Zipkin service.
 * @param urlStr - url to send spans
 * @param headers - headers
 * send
 */
export function prepareSend(urlStr, headers) {
    const url = new URL(urlStr);
    const reqOpts = Object.assign({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
    /**
     * Send spans to the remote Zipkin service.
     */
    return function send(zipkinSpans, done) {
        if (zipkinSpans.length === 0) {
            diag.debug('Zipkin send with empty spans');
            return done({ code: ExportResultCode.SUCCESS });
        }
        const { request } = url.protocol === 'http:' ? http : https;
        const req = request(url, reqOpts, (res) => {
            let rawData = '';
            res.on('data', chunk => {
                rawData += chunk;
            });
            res.on('end', () => {
                const statusCode = res.statusCode || 0;
                diag.debug(`Zipkin response status code: ${statusCode}, body: ${rawData}`);
                // Consider 2xx and 3xx as success.
                if (statusCode < 400) {
                    return done({ code: ExportResultCode.SUCCESS });
                    // Consider 4xx as failed non-retryable.
                }
                else {
                    return done({
                        code: ExportResultCode.FAILED,
                        error: new Error(`Got unexpected status code from zipkin: ${statusCode}`),
                    });
                }
            });
        });
        req.on('error', error => {
            return done({
                code: ExportResultCode.FAILED,
                error,
            });
        });
        // Issue request to remote service
        const payload = JSON.stringify(zipkinSpans);
        diag.debug(`Zipkin request payload: ${payload}`);
        req.write(payload, 'utf8');
        req.end();
    };
}
//# sourceMappingURL=util.js.map