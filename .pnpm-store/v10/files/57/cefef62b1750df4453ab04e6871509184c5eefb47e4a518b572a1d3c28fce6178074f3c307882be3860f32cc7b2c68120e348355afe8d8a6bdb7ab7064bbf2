"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAndSend = exports.sendWithHttp = void 0;
const zlib = require("zlib");
const stream_1 = require("stream");
const is_export_retryable_1 = require("../is-export-retryable");
const types_1 = require("../types");
/**
 * Sends data using http
 * @param requestFunction
 * @param params
 * @param agent
 * @param data
 * @param onDone
 * @param timeoutMillis
 */
function sendWithHttp(request, params, agent, data, onDone, timeoutMillis) {
    const parsedUrl = new URL(params.url);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
            ...params.headers(),
        },
        agent: agent,
    };
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
            else if (res.statusCode && (0, is_export_retryable_1.isExportRetryable)(res.statusCode)) {
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
            error,
        });
    });
    compressAndSend(req, params.compression, data, (error) => {
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
//# sourceMappingURL=http-transport-utils.js.map