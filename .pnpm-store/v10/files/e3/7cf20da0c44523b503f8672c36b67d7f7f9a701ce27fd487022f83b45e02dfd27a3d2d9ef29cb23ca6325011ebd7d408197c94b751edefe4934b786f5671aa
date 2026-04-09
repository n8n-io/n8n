"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAndSend = exports.sendWithHttp = void 0;
const zlib = require("zlib");
const stream_1 = require("stream");
const is_export_retryable_1 = require("../is-export-retryable");
const types_1 = require("../types");
const version_1 = require("../version");
const DEFAULT_USER_AGENT = `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`;
/**
 * Sends data using http
 * @param request
 * @param url
 * @param headers
 * @param compression
 * @param userAgent
 * @param agent
 * @param data
 * @param onDone
 * @param timeoutMillis
 */
function sendWithHttp(request, url, headers, compression, userAgent, agent, data, onDone, timeoutMillis) {
    const parsedUrl = new URL(url);
    if (userAgent) {
        headers['User-Agent'] = `${userAgent} ${DEFAULT_USER_AGENT}`;
    }
    else {
        headers['User-Agent'] = DEFAULT_USER_AGENT;
    }
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers,
        agent,
    };
    const req = request(options, (res) => {
        const responseData = [];
        res.on('data', chunk => responseData.push(chunk));
        res.on('end', () => {
            if (res.statusCode && res.statusCode <= 299) {
                onDone({
                    status: 'success',
                    data: Buffer.concat(responseData),
                });
            }
            else if (res.statusCode && (0, is_export_retryable_1.isExportHTTPErrorRetryable)(res.statusCode)) {
                onDone({
                    status: 'retryable',
                    retryInMillis: (0, is_export_retryable_1.parseRetryAfterToMills)(res.headers['retry-after']),
                });
            }
            else {
                const error = new types_1.OTLPExporterError(res.statusMessage, res.statusCode, Buffer.concat(responseData).toString());
                onDone({
                    status: 'failure',
                    error,
                });
            }
        });
        res.on('error', (error) => {
            // Note: 'end' may still be emitted after 'error' on the same response object.
            // However, since onDone maps to a Promise resolve/reject, only the first call takes effect.
            // This will be addressed in https://github.com/open-telemetry/opentelemetry-js/issues/5990
            if (res.statusCode && res.statusCode <= 299) {
                // If the response is successful but an error occurs while reading the response,
                // we consider it a success since the data has been sent successfully.
                onDone({
                    status: 'success',
                });
            }
            else if (res.statusCode && (0, is_export_retryable_1.isExportHTTPErrorRetryable)(res.statusCode)) {
                onDone({
                    status: 'retryable',
                    error: error,
                    retryInMillis: (0, is_export_retryable_1.parseRetryAfterToMills)(res.headers['retry-after']),
                });
            }
            else {
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
            status: 'retryable',
            error: new Error('Request timed out'),
        });
    });
    req.on('error', (error) => {
        if (isHttpTransportNetworkErrorRetryable(error)) {
            onDone({
                status: 'retryable',
                error,
            });
        }
        else {
            onDone({
                status: 'failure',
                error,
            });
        }
    });
    compressAndSend(req, compression, data, (error) => {
        onDone({
            status: 'failure',
            error,
        });
    });
}
exports.sendWithHttp = sendWithHttp;
function compressAndSend(req, compression, data, onError) {
    let dataStream = readableFromUint8Array(data);
    if (compression === 'gzip') {
        req.setHeader('Content-Encoding', 'gzip');
        dataStream = dataStream
            .on('error', onError)
            .pipe(zlib.createGzip())
            .on('error', onError);
    }
    dataStream.pipe(req).on('error', onError);
}
exports.compressAndSend = compressAndSend;
function readableFromUint8Array(buff) {
    const readable = new stream_1.Readable();
    readable.push(buff);
    readable.push(null);
    return readable;
}
function isHttpTransportNetworkErrorRetryable(error) {
    const RETRYABLE_NETWORK_ERROR_CODES = new Set([
        'ECONNRESET',
        'ECONNREFUSED',
        'EPIPE',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
    ]);
    if ('code' in error && typeof error.code === 'string') {
        return RETRYABLE_NETWORK_ERROR_CODES.has(error.code);
    }
    return false;
}
//# sourceMappingURL=http-transport-utils.js.map