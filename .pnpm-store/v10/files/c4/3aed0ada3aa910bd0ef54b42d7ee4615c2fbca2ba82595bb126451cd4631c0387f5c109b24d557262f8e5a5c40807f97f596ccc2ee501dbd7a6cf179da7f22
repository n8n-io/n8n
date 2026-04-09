"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerDuplexStreamImpl = exports.ServerWritableStreamImpl = exports.ServerReadableStreamImpl = exports.ServerUnaryCallImpl = void 0;
exports.serverErrorToStatus = serverErrorToStatus;
const events_1 = require("events");
const stream_1 = require("stream");
const constants_1 = require("./constants");
const metadata_1 = require("./metadata");
function serverErrorToStatus(error, overrideTrailers) {
    var _a;
    const status = {
        code: constants_1.Status.UNKNOWN,
        details: 'message' in error ? error.message : 'Unknown Error',
        metadata: (_a = overrideTrailers !== null && overrideTrailers !== void 0 ? overrideTrailers : error.metadata) !== null && _a !== void 0 ? _a : null,
    };
    if ('code' in error &&
        typeof error.code === 'number' &&
        Number.isInteger(error.code)) {
        status.code = error.code;
        if ('details' in error && typeof error.details === 'string') {
            status.details = error.details;
        }
    }
    return status;
}
class ServerUnaryCallImpl extends events_1.EventEmitter {
    constructor(path, call, metadata, request) {
        super();
        this.path = path;
        this.call = call;
        this.metadata = metadata;
        this.request = request;
        this.cancelled = false;
    }
    getPeer() {
        return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
        this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
        return this.call.getDeadline();
    }
    getPath() {
        return this.path;
    }
    getHost() {
        return this.call.getHost();
    }
    getAuthContext() {
        return this.call.getAuthContext();
    }
    getMetricsRecorder() {
        return this.call.getMetricsRecorder();
    }
}
exports.ServerUnaryCallImpl = ServerUnaryCallImpl;
class ServerReadableStreamImpl extends stream_1.Readable {
    constructor(path, call, metadata) {
        super({ objectMode: true });
        this.path = path;
        this.call = call;
        this.metadata = metadata;
        this.cancelled = false;
    }
    _read(size) {
        this.call.startRead();
    }
    getPeer() {
        return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
        this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
        return this.call.getDeadline();
    }
    getPath() {
        return this.path;
    }
    getHost() {
        return this.call.getHost();
    }
    getAuthContext() {
        return this.call.getAuthContext();
    }
    getMetricsRecorder() {
        return this.call.getMetricsRecorder();
    }
}
exports.ServerReadableStreamImpl = ServerReadableStreamImpl;
class ServerWritableStreamImpl extends stream_1.Writable {
    constructor(path, call, metadata, request) {
        super({ objectMode: true });
        this.path = path;
        this.call = call;
        this.metadata = metadata;
        this.request = request;
        this.pendingStatus = {
            code: constants_1.Status.OK,
            details: 'OK',
        };
        this.cancelled = false;
        this.trailingMetadata = new metadata_1.Metadata();
        this.on('error', err => {
            this.pendingStatus = serverErrorToStatus(err);
            this.end();
        });
    }
    getPeer() {
        return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
        this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
        return this.call.getDeadline();
    }
    getPath() {
        return this.path;
    }
    getHost() {
        return this.call.getHost();
    }
    getAuthContext() {
        return this.call.getAuthContext();
    }
    getMetricsRecorder() {
        return this.call.getMetricsRecorder();
    }
    _write(chunk, encoding, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback) {
        this.call.sendMessage(chunk, callback);
    }
    _final(callback) {
        var _a;
        callback(null);
        this.call.sendStatus(Object.assign(Object.assign({}, this.pendingStatus), { metadata: (_a = this.pendingStatus.metadata) !== null && _a !== void 0 ? _a : this.trailingMetadata }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    end(metadata) {
        if (metadata) {
            this.trailingMetadata = metadata;
        }
        return super.end();
    }
}
exports.ServerWritableStreamImpl = ServerWritableStreamImpl;
class ServerDuplexStreamImpl extends stream_1.Duplex {
    constructor(path, call, metadata) {
        super({ objectMode: true });
        this.path = path;
        this.call = call;
        this.metadata = metadata;
        this.pendingStatus = {
            code: constants_1.Status.OK,
            details: 'OK',
        };
        this.cancelled = false;
        this.trailingMetadata = new metadata_1.Metadata();
        this.on('error', err => {
            this.pendingStatus = serverErrorToStatus(err);
            this.end();
        });
    }
    getPeer() {
        return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
        this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
        return this.call.getDeadline();
    }
    getPath() {
        return this.path;
    }
    getHost() {
        return this.call.getHost();
    }
    getAuthContext() {
        return this.call.getAuthContext();
    }
    getMetricsRecorder() {
        return this.call.getMetricsRecorder();
    }
    _read(size) {
        this.call.startRead();
    }
    _write(chunk, encoding, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback) {
        this.call.sendMessage(chunk, callback);
    }
    _final(callback) {
        var _a;
        callback(null);
        this.call.sendStatus(Object.assign(Object.assign({}, this.pendingStatus), { metadata: (_a = this.pendingStatus.metadata) !== null && _a !== void 0 ? _a : this.trailingMetadata }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    end(metadata) {
        if (metadata) {
            this.trailingMetadata = metadata;
        }
        return super.end();
    }
}
exports.ServerDuplexStreamImpl = ServerDuplexStreamImpl;
//# sourceMappingURL=server-call.js.map