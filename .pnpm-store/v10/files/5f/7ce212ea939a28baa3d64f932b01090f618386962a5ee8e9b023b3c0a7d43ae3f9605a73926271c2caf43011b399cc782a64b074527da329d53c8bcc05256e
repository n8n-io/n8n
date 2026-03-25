"use strict";
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.teenyRequest = exports.RequestError = void 0;
const node_fetch_1 = require("node-fetch");
const stream_1 = require("stream");
const uuid = require("uuid");
const agents_1 = require("./agents");
const TeenyStatistics_1 = require("./TeenyStatistics");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const streamEvents = require('stream-events');
class RequestError extends Error {
}
exports.RequestError = RequestError;
/**
 * Convert options from Request to Fetch format
 * @private
 * @param reqOpts Request options
 */
function requestToFetchOptions(reqOpts) {
    const options = {
        method: reqOpts.method || 'GET',
        ...(reqOpts.timeout && { timeout: reqOpts.timeout }),
        ...(typeof reqOpts.gzip === 'boolean' && { compress: reqOpts.gzip }),
    };
    if (typeof reqOpts.json === 'object') {
        // Add Content-type: application/json header
        reqOpts.headers = reqOpts.headers || {};
        reqOpts.headers['Content-Type'] = 'application/json';
        // Set body to JSON representation of value
        options.body = JSON.stringify(reqOpts.json);
    }
    else {
        if (Buffer.isBuffer(reqOpts.body)) {
            options.body = reqOpts.body;
        }
        else if (typeof reqOpts.body !== 'string') {
            options.body = JSON.stringify(reqOpts.body);
        }
        else {
            options.body = reqOpts.body;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options.headers = reqOpts.headers;
    let uri = (reqOpts.uri ||
        reqOpts.url);
    if (!uri) {
        throw new Error('Missing uri or url in reqOpts.');
    }
    if (reqOpts.useQuerystring === true || typeof reqOpts.qs === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const qs = require('querystring');
        const params = qs.stringify(reqOpts.qs);
        uri = uri + '?' + params;
    }
    options.agent = (0, agents_1.getAgent)(uri, reqOpts);
    return { uri, options };
}
/**
 * Convert a response from `fetch` to `request` format.
 * @private
 * @param opts The `request` options used to create the request.
 * @param res The Fetch response
 * @returns A `request` response object
 */
function fetchToRequestResponse(opts, res) {
    const request = {};
    request.agent = opts.agent || false;
    request.headers = (opts.headers || {});
    request.href = res.url;
    // headers need to be converted from a map to an obj
    const resHeaders = {};
    res.headers.forEach((value, key) => (resHeaders[key] = value));
    const response = Object.assign(res.body, {
        statusCode: res.status,
        statusMessage: res.statusText,
        request,
        body: res.body,
        headers: resHeaders,
        toJSON: () => ({ headers: resHeaders }),
    });
    return response;
}
/**
 * Create POST body from two parts as multipart/related content-type
 * @private
 * @param boundary
 * @param multipart
 */
function createMultipartStream(boundary, multipart) {
    const finale = `--${boundary}--`;
    const stream = new stream_1.PassThrough();
    for (const part of multipart) {
        const preamble = `--${boundary}\r\nContent-Type: ${part['Content-Type']}\r\n\r\n`;
        stream.write(preamble);
        if (typeof part.body === 'string') {
            stream.write(part.body);
            stream.write('\r\n');
        }
        else {
            part.body.pipe(stream, { end: false });
            part.body.on('end', () => {
                stream.write('\r\n');
                stream.write(finale);
                stream.end();
            });
        }
    }
    return stream;
}
function teenyRequest(reqOpts, callback) {
    const { uri, options } = requestToFetchOptions(reqOpts);
    const multipart = reqOpts.multipart;
    if (reqOpts.multipart && multipart.length === 2) {
        if (!callback) {
            // TODO: add support for multipart uploads through streaming
            throw new Error('Multipart without callback is not implemented.');
        }
        const boundary = uuid.v4();
        options.headers['Content-Type'] = `multipart/related; boundary=${boundary}`;
        options.body = createMultipartStream(boundary, multipart);
        // Multipart upload
        teenyRequest.stats.requestStarting();
        (0, node_fetch_1.default)(uri, options).then(res => {
            teenyRequest.stats.requestFinished();
            const header = res.headers.get('content-type');
            const response = fetchToRequestResponse(options, res);
            const body = response.body;
            if (header === 'application/json' ||
                header === 'application/json; charset=utf-8') {
                res.json().then(json => {
                    response.body = json;
                    callback(null, response, json);
                }, (err) => {
                    callback(err, response, body);
                });
                return;
            }
            res.text().then(text => {
                response.body = text;
                callback(null, response, text);
            }, err => {
                callback(err, response, body);
            });
        }, err => {
            teenyRequest.stats.requestFinished();
            callback(err, null, null);
        });
        return;
    }
    if (callback === undefined) {
        // Stream mode
        const requestStream = streamEvents(new stream_1.PassThrough());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let responseStream;
        requestStream.once('reading', () => {
            if (responseStream) {
                (0, stream_1.pipeline)(responseStream, requestStream, () => { });
            }
            else {
                requestStream.once('response', () => {
                    (0, stream_1.pipeline)(responseStream, requestStream, () => { });
                });
            }
        });
        options.compress = false;
        teenyRequest.stats.requestStarting();
        (0, node_fetch_1.default)(uri, options).then(res => {
            teenyRequest.stats.requestFinished();
            responseStream = res.body;
            responseStream.on('error', (err) => {
                requestStream.emit('error', err);
            });
            const response = fetchToRequestResponse(options, res);
            requestStream.emit('response', response);
        }, err => {
            teenyRequest.stats.requestFinished();
            requestStream.emit('error', err);
        });
        // fetch doesn't supply the raw HTTP stream, instead it
        // returns a PassThrough piped from the HTTP response
        // stream.
        return requestStream;
    }
    // GET or POST with callback
    teenyRequest.stats.requestStarting();
    (0, node_fetch_1.default)(uri, options).then(res => {
        teenyRequest.stats.requestFinished();
        const header = res.headers.get('content-type');
        const response = fetchToRequestResponse(options, res);
        const body = response.body;
        if (header === 'application/json' ||
            header === 'application/json; charset=utf-8') {
            if (response.statusCode === 204) {
                // Probably a DELETE
                callback(null, response, body);
                return;
            }
            res.json().then(json => {
                response.body = json;
                callback(null, response, json);
            }, err => {
                callback(err, response, body);
            });
            return;
        }
        res.text().then(text => {
            const response = fetchToRequestResponse(options, res);
            response.body = text;
            callback(null, response, text);
        }, err => {
            callback(err, response, body);
        });
    }, err => {
        teenyRequest.stats.requestFinished();
        callback(err, null, null);
    });
    return;
}
exports.teenyRequest = teenyRequest;
teenyRequest.defaults = (defaults) => {
    return (reqOpts, callback) => {
        const opts = { ...defaults, ...reqOpts };
        if (callback === undefined) {
            return teenyRequest(opts);
        }
        teenyRequest(opts, callback);
    };
};
/**
 * Single instance of an interface for keeping track of things.
 */
teenyRequest.stats = new TeenyStatistics_1.TeenyStatistics();
teenyRequest.resetStats = () => {
    teenyRequest.stats = new TeenyStatistics_1.TeenyStatistics(teenyRequest.stats.getOptions());
};
//# sourceMappingURL=index.js.map