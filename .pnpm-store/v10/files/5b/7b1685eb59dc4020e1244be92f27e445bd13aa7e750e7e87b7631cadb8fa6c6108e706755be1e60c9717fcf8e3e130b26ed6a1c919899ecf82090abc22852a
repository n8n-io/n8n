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
import { ExportResultCode, globalErrorHandler, } from '@opentelemetry/core';
/**
 * Prepares send function that will send spans to the remote Zipkin service.
 * @param urlStr - url to send spans
 * @param headers - headers
 * send
 */
export function prepareSend(urlStr, headers) {
    let xhrHeaders;
    const useBeacon = typeof navigator.sendBeacon === 'function' && !headers;
    if (headers) {
        xhrHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...headers,
        };
    }
    /**
     * Send spans to the remote Zipkin service.
     */
    return function send(zipkinSpans, done) {
        if (zipkinSpans.length === 0) {
            diag.debug('Zipkin send with empty spans');
            return done({ code: ExportResultCode.SUCCESS });
        }
        const payload = JSON.stringify(zipkinSpans);
        if (useBeacon) {
            sendWithBeacon(payload, done, urlStr);
        }
        else {
            sendWithXhr(payload, done, urlStr, xhrHeaders);
        }
    };
}
/**
 * Sends data using beacon
 * @param data
 * @param done
 * @param urlStr
 */
function sendWithBeacon(data, done, urlStr) {
    if (navigator.sendBeacon(urlStr, data)) {
        diag.debug('sendBeacon - can send', data);
        done({ code: ExportResultCode.SUCCESS });
    }
    else {
        done({
            code: ExportResultCode.FAILED,
            error: new Error(`sendBeacon - cannot send ${data}`),
        });
    }
}
/**
 * Sends data using XMLHttpRequest
 * @param data
 * @param done
 * @param urlStr
 * @param xhrHeaders
 */
function sendWithXhr(data, done, urlStr, xhrHeaders = {}) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', urlStr);
    Object.entries(xhrHeaders).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
    });
    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const statusCode = xhr.status || 0;
            diag.debug(`Zipkin response status code: ${statusCode}, body: ${data}`);
            if (xhr.status >= 200 && xhr.status < 400) {
                return done({ code: ExportResultCode.SUCCESS });
            }
            else {
                return done({
                    code: ExportResultCode.FAILED,
                    error: new Error(`Got unexpected status code from zipkin: ${xhr.status}`),
                });
            }
        }
    };
    xhr.onerror = msg => {
        globalErrorHandler(new Error(`Zipkin request error: ${msg}`));
        return done({ code: ExportResultCode.FAILED });
    };
    // Issue request to remote service
    diag.debug(`Zipkin request payload: ${data}`);
    xhr.send(data);
}
//# sourceMappingURL=util.js.map