var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import * as http from 'http';
import * as https from 'https';
import * as zlib from 'zlib';
import { Readable } from 'stream';
import { isExportRetryable, parseRetryAfterToMills, } from '../../is-export-retryable';
import { OTLPExporterError } from '../../types';
/**
 * Sends data using http
 * @param params
 * @param agent
 * @param data
 * @param onDone
 * @param timeoutMillis
 */
export function sendWithHttp(params, agent, data, onDone, timeoutMillis) {
    var parsedUrl = new URL(params.url);
    var nodeVersion = Number(process.versions.node.split('.')[0]);
    var options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: __assign({}, params.headers),
        agent: agent,
    };
    var request = parsedUrl.protocol === 'http:' ? http.request : https.request;
    var req = request(options, function (res) {
        var responseData = [];
        res.on('data', function (chunk) { return responseData.push(chunk); });
        res.on('end', function () {
            if (res.statusCode && res.statusCode < 299) {
                onDone({
                    status: 'success',
                    data: Buffer.concat(responseData),
                });
            }
            else if (res.statusCode && isExportRetryable(res.statusCode)) {
                onDone({
                    status: 'retryable',
                    retryInMillis: parseRetryAfterToMills(res.headers['retry-after']),
                });
            }
            else {
                var error = new OTLPExporterError(res.statusMessage, res.statusCode);
                onDone({
                    status: 'failure',
                    error: error,
                });
            }
        });
    });
    req.setTimeout(timeoutMillis, function () {
        req.destroy();
        onDone({
            status: 'failure',
            error: new Error('Request Timeout'),
        });
    });
    req.on('error', function (error) {
        onDone({
            status: 'failure',
            error: error,
        });
    });
    var reportTimeoutErrorEvent = nodeVersion >= 14 ? 'close' : 'abort';
    req.on(reportTimeoutErrorEvent, function () {
        onDone({
            status: 'failure',
            error: new Error('Request timed out'),
        });
    });
    compressAndSend(req, params.compression, data, function (error) {
        onDone({
            status: 'failure',
            error: error,
        });
    });
}
function compressAndSend(req, compression, data, onError) {
    var dataStream = readableFromUint8Array(data);
    if (compression === 'gzip') {
        req.setHeader('Content-Encoding', 'gzip');
        dataStream = dataStream
            .on('error', onError)
            .pipe(zlib.createGzip())
            .on('error', onError);
    }
    dataStream.pipe(req);
}
function readableFromUint8Array(buff) {
    var readable = new Readable();
    readable.push(buff);
    readable.push(null);
    return readable;
}
export function createHttpAgent(rawUrl, agentOptions) {
    var parsedUrl = new URL(rawUrl);
    var Agent = parsedUrl.protocol === 'http:' ? http.Agent : https.Agent;
    return new Agent(agentOptions);
}
//# sourceMappingURL=http-transport-utils.js.map