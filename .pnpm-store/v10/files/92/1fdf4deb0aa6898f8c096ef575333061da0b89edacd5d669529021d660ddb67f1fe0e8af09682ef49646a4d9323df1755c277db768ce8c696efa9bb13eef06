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
exports.ClientDuplexStreamImpl = exports.ClientWritableStreamImpl = exports.ClientReadableStreamImpl = exports.ClientUnaryCallImpl = void 0;
exports.callErrorFromStatus = callErrorFromStatus;
const events_1 = require("events");
const stream_1 = require("stream");
const constants_1 = require("./constants");
/**
 * Construct a ServiceError from a StatusObject. This function exists primarily
 * as an attempt to make the error stack trace clearly communicate that the
 * error is not necessarily a problem in gRPC itself.
 * @param status
 */
function callErrorFromStatus(status, callerStack) {
    const message = `${status.code} ${constants_1.Status[status.code]}: ${status.details}`;
    const error = new Error(message);
    const stack = `${error.stack}\nfor call at\n${callerStack}`;
    return Object.assign(new Error(message), status, { stack });
}
class ClientUnaryCallImpl extends events_1.EventEmitter {
    constructor() {
        super();
    }
    cancel() {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(constants_1.Status.CANCELLED, 'Cancelled on client');
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : 'unknown';
    }
    getAuthContext() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getAuthContext()) !== null && _b !== void 0 ? _b : null;
    }
}
exports.ClientUnaryCallImpl = ClientUnaryCallImpl;
class ClientReadableStreamImpl extends stream_1.Readable {
    constructor(deserialize) {
        super({ objectMode: true });
        this.deserialize = deserialize;
    }
    cancel() {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(constants_1.Status.CANCELLED, 'Cancelled on client');
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : 'unknown';
    }
    getAuthContext() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getAuthContext()) !== null && _b !== void 0 ? _b : null;
    }
    _read(_size) {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.startRead();
    }
}
exports.ClientReadableStreamImpl = ClientReadableStreamImpl;
class ClientWritableStreamImpl extends stream_1.Writable {
    constructor(serialize) {
        super({ objectMode: true });
        this.serialize = serialize;
    }
    cancel() {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(constants_1.Status.CANCELLED, 'Cancelled on client');
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : 'unknown';
    }
    getAuthContext() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getAuthContext()) !== null && _b !== void 0 ? _b : null;
    }
    _write(chunk, encoding, cb) {
        var _a;
        const context = {
            callback: cb,
        };
        const flags = Number(encoding);
        if (!Number.isNaN(flags)) {
            context.flags = flags;
        }
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.sendMessageWithContext(context, chunk);
    }
    _final(cb) {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.halfClose();
        cb();
    }
}
exports.ClientWritableStreamImpl = ClientWritableStreamImpl;
class ClientDuplexStreamImpl extends stream_1.Duplex {
    constructor(serialize, deserialize) {
        super({ objectMode: true });
        this.serialize = serialize;
        this.deserialize = deserialize;
    }
    cancel() {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.cancelWithStatus(constants_1.Status.CANCELLED, 'Cancelled on client');
    }
    getPeer() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getPeer()) !== null && _b !== void 0 ? _b : 'unknown';
    }
    getAuthContext() {
        var _a, _b;
        return (_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.getAuthContext()) !== null && _b !== void 0 ? _b : null;
    }
    _read(_size) {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.startRead();
    }
    _write(chunk, encoding, cb) {
        var _a;
        const context = {
            callback: cb,
        };
        const flags = Number(encoding);
        if (!Number.isNaN(flags)) {
            context.flags = flags;
        }
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.sendMessageWithContext(context, chunk);
    }
    _final(cb) {
        var _a;
        (_a = this.call) === null || _a === void 0 ? void 0 : _a.halfClose();
        cb();
    }
}
exports.ClientDuplexStreamImpl = ClientDuplexStreamImpl;
//# sourceMappingURL=call.js.map