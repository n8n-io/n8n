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
    const parsedUrl = new URL(params.url);
    const nodeVersion = Number(process.versions.node.split('.')[0]);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: Object.assign({}, params.headers),
        agent: agent,
    };
    const request = parsedUrl.protocol === 'http:' ? http.request : https.request;
    const req = request(options, (res) => {
        const responseData = [];
        res.on('data', chunk => responseData.push(chunk));
        res.on('end', () => {
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
                const error = new OTLPExporterError(res.statusMessage, res.statusCode);
                onDone({
                    status: 'failure',
                    error,
                });
            }
        });
    });
    req.setTimeout(timeoutMillis, () => {
        req.destroy();
        onDone({
            status: 'failure',
            error: new Error('Request Timeout'),
        });
    });
    req.on('error', (error) => {
        onDone({
            status: 'failure',
            error: error,
        });
    });
    const reportTimeoutErrorEvent = nodeVersion >= 14 ? 'close' : 'abort';
    req.on(reportTimeoutErrorEvent, () => {
        onDone({
            status: 'failure',
            error: new Error('Request timed out'),
        });
    });
    compressAndSend(req, params.compression, data, (error) => {
        onDone({
            status: 'failure',
            error,
        });
    });
}
function compressAndSend(req, compression, data, onError) {
    let dataStream = readableFromUint8Array(data);
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
    const readable = new Readable();
    readable.push(buff);
    readable.push(null);
    return readable;
}
export function createHttpAgent(rawUrl, agentOptions) {
    const parsedUrl = new URL(rawUrl);
    const Agent = parsedUrl.protocol === 'http:' ? http.Agent : https.Agent;
    return new Agent(agentOptions);
}
//# sourceMappingURL=http-transport-utils.js.map