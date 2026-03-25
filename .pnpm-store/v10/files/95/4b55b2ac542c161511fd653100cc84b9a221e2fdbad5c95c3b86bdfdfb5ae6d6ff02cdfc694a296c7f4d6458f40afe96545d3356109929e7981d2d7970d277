"use strict";
/*
 * Copyright 2024 gRPC authors.
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
exports.BaseServerInterceptingCall = exports.ServerInterceptingCall = exports.ResponderBuilder = exports.ServerListenerBuilder = void 0;
exports.isInterceptingServerListener = isInterceptingServerListener;
exports.getServerInterceptingCall = getServerInterceptingCall;
const metadata_1 = require("./metadata");
const constants_1 = require("./constants");
const http2 = require("http2");
const error_1 = require("./error");
const zlib = require("zlib");
const stream_decoder_1 = require("./stream-decoder");
const logging = require("./logging");
const TRACER_NAME = 'server_call';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
class ServerListenerBuilder {
    constructor() {
        this.metadata = undefined;
        this.message = undefined;
        this.halfClose = undefined;
        this.cancel = undefined;
    }
    withOnReceiveMetadata(onReceiveMetadata) {
        this.metadata = onReceiveMetadata;
        return this;
    }
    withOnReceiveMessage(onReceiveMessage) {
        this.message = onReceiveMessage;
        return this;
    }
    withOnReceiveHalfClose(onReceiveHalfClose) {
        this.halfClose = onReceiveHalfClose;
        return this;
    }
    withOnCancel(onCancel) {
        this.cancel = onCancel;
        return this;
    }
    build() {
        return {
            onReceiveMetadata: this.metadata,
            onReceiveMessage: this.message,
            onReceiveHalfClose: this.halfClose,
            onCancel: this.cancel,
        };
    }
}
exports.ServerListenerBuilder = ServerListenerBuilder;
function isInterceptingServerListener(listener) {
    return (listener.onReceiveMetadata !== undefined &&
        listener.onReceiveMetadata.length === 1);
}
class InterceptingServerListenerImpl {
    constructor(listener, nextListener) {
        this.listener = listener;
        this.nextListener = nextListener;
        /**
         * Once the call is cancelled, ignore all other events.
         */
        this.cancelled = false;
        this.processingMetadata = false;
        this.hasPendingMessage = false;
        this.pendingMessage = null;
        this.processingMessage = false;
        this.hasPendingHalfClose = false;
    }
    processPendingMessage() {
        if (this.hasPendingMessage) {
            this.nextListener.onReceiveMessage(this.pendingMessage);
            this.pendingMessage = null;
            this.hasPendingMessage = false;
        }
    }
    processPendingHalfClose() {
        if (this.hasPendingHalfClose) {
            this.nextListener.onReceiveHalfClose();
            this.hasPendingHalfClose = false;
        }
    }
    onReceiveMetadata(metadata) {
        if (this.cancelled) {
            return;
        }
        this.processingMetadata = true;
        this.listener.onReceiveMetadata(metadata, interceptedMetadata => {
            this.processingMetadata = false;
            if (this.cancelled) {
                return;
            }
            this.nextListener.onReceiveMetadata(interceptedMetadata);
            this.processPendingMessage();
            this.processPendingHalfClose();
        });
    }
    onReceiveMessage(message) {
        if (this.cancelled) {
            return;
        }
        this.processingMessage = true;
        this.listener.onReceiveMessage(message, msg => {
            this.processingMessage = false;
            if (this.cancelled) {
                return;
            }
            if (this.processingMetadata) {
                this.pendingMessage = msg;
                this.hasPendingMessage = true;
            }
            else {
                this.nextListener.onReceiveMessage(msg);
                this.processPendingHalfClose();
            }
        });
    }
    onReceiveHalfClose() {
        if (this.cancelled) {
            return;
        }
        this.listener.onReceiveHalfClose(() => {
            if (this.cancelled) {
                return;
            }
            if (this.processingMetadata || this.processingMessage) {
                this.hasPendingHalfClose = true;
            }
            else {
                this.nextListener.onReceiveHalfClose();
            }
        });
    }
    onCancel() {
        this.cancelled = true;
        this.listener.onCancel();
        this.nextListener.onCancel();
    }
}
class ResponderBuilder {
    constructor() {
        this.start = undefined;
        this.metadata = undefined;
        this.message = undefined;
        this.status = undefined;
    }
    withStart(start) {
        this.start = start;
        return this;
    }
    withSendMetadata(sendMetadata) {
        this.metadata = sendMetadata;
        return this;
    }
    withSendMessage(sendMessage) {
        this.message = sendMessage;
        return this;
    }
    withSendStatus(sendStatus) {
        this.status = sendStatus;
        return this;
    }
    build() {
        return {
            start: this.start,
            sendMetadata: this.metadata,
            sendMessage: this.message,
            sendStatus: this.status,
        };
    }
}
exports.ResponderBuilder = ResponderBuilder;
const defaultServerListener = {
    onReceiveMetadata: (metadata, next) => {
        next(metadata);
    },
    onReceiveMessage: (message, next) => {
        next(message);
    },
    onReceiveHalfClose: next => {
        next();
    },
    onCancel: () => { },
};
const defaultResponder = {
    start: next => {
        next();
    },
    sendMetadata: (metadata, next) => {
        next(metadata);
    },
    sendMessage: (message, next) => {
        next(message);
    },
    sendStatus: (status, next) => {
        next(status);
    },
};
class ServerInterceptingCall {
    constructor(nextCall, responder) {
        var _a, _b, _c, _d;
        this.nextCall = nextCall;
        this.processingMetadata = false;
        this.sentMetadata = false;
        this.processingMessage = false;
        this.pendingMessage = null;
        this.pendingMessageCallback = null;
        this.pendingStatus = null;
        this.responder = {
            start: (_a = responder === null || responder === void 0 ? void 0 : responder.start) !== null && _a !== void 0 ? _a : defaultResponder.start,
            sendMetadata: (_b = responder === null || responder === void 0 ? void 0 : responder.sendMetadata) !== null && _b !== void 0 ? _b : defaultResponder.sendMetadata,
            sendMessage: (_c = responder === null || responder === void 0 ? void 0 : responder.sendMessage) !== null && _c !== void 0 ? _c : defaultResponder.sendMessage,
            sendStatus: (_d = responder === null || responder === void 0 ? void 0 : responder.sendStatus) !== null && _d !== void 0 ? _d : defaultResponder.sendStatus,
        };
    }
    processPendingMessage() {
        if (this.pendingMessageCallback) {
            this.nextCall.sendMessage(this.pendingMessage, this.pendingMessageCallback);
            this.pendingMessage = null;
            this.pendingMessageCallback = null;
        }
    }
    processPendingStatus() {
        if (this.pendingStatus) {
            this.nextCall.sendStatus(this.pendingStatus);
            this.pendingStatus = null;
        }
    }
    start(listener) {
        this.responder.start(interceptedListener => {
            var _a, _b, _c, _d;
            const fullInterceptedListener = {
                onReceiveMetadata: (_a = interceptedListener === null || interceptedListener === void 0 ? void 0 : interceptedListener.onReceiveMetadata) !== null && _a !== void 0 ? _a : defaultServerListener.onReceiveMetadata,
                onReceiveMessage: (_b = interceptedListener === null || interceptedListener === void 0 ? void 0 : interceptedListener.onReceiveMessage) !== null && _b !== void 0 ? _b : defaultServerListener.onReceiveMessage,
                onReceiveHalfClose: (_c = interceptedListener === null || interceptedListener === void 0 ? void 0 : interceptedListener.onReceiveHalfClose) !== null && _c !== void 0 ? _c : defaultServerListener.onReceiveHalfClose,
                onCancel: (_d = interceptedListener === null || interceptedListener === void 0 ? void 0 : interceptedListener.onCancel) !== null && _d !== void 0 ? _d : defaultServerListener.onCancel,
            };
            const finalInterceptingListener = new InterceptingServerListenerImpl(fullInterceptedListener, listener);
            this.nextCall.start(finalInterceptingListener);
        });
    }
    sendMetadata(metadata) {
        this.processingMetadata = true;
        this.sentMetadata = true;
        this.responder.sendMetadata(metadata, interceptedMetadata => {
            this.processingMetadata = false;
            this.nextCall.sendMetadata(interceptedMetadata);
            this.processPendingMessage();
            this.processPendingStatus();
        });
    }
    sendMessage(message, callback) {
        this.processingMessage = true;
        if (!this.sentMetadata) {
            this.sendMetadata(new metadata_1.Metadata());
        }
        this.responder.sendMessage(message, interceptedMessage => {
            this.processingMessage = false;
            if (this.processingMetadata) {
                this.pendingMessage = interceptedMessage;
                this.pendingMessageCallback = callback;
            }
            else {
                this.nextCall.sendMessage(interceptedMessage, callback);
            }
        });
    }
    sendStatus(status) {
        this.responder.sendStatus(status, interceptedStatus => {
            if (this.processingMetadata || this.processingMessage) {
                this.pendingStatus = interceptedStatus;
            }
            else {
                this.nextCall.sendStatus(interceptedStatus);
            }
        });
    }
    startRead() {
        this.nextCall.startRead();
    }
    getPeer() {
        return this.nextCall.getPeer();
    }
    getDeadline() {
        return this.nextCall.getDeadline();
    }
    getHost() {
        return this.nextCall.getHost();
    }
}
exports.ServerInterceptingCall = ServerInterceptingCall;
const GRPC_ACCEPT_ENCODING_HEADER = 'grpc-accept-encoding';
const GRPC_ENCODING_HEADER = 'grpc-encoding';
const GRPC_MESSAGE_HEADER = 'grpc-message';
const GRPC_STATUS_HEADER = 'grpc-status';
const GRPC_TIMEOUT_HEADER = 'grpc-timeout';
const DEADLINE_REGEX = /(\d{1,8})\s*([HMSmun])/;
const deadlineUnitsToMs = {
    H: 3600000,
    M: 60000,
    S: 1000,
    m: 1,
    u: 0.001,
    n: 0.000001,
};
const defaultCompressionHeaders = {
    // TODO(cjihrig): Remove these encoding headers from the default response
    // once compression is integrated.
    [GRPC_ACCEPT_ENCODING_HEADER]: 'identity,deflate,gzip',
    [GRPC_ENCODING_HEADER]: 'identity',
};
const defaultResponseHeaders = {
    [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_OK,
    [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/grpc+proto',
};
const defaultResponseOptions = {
    waitForTrailers: true,
};
class BaseServerInterceptingCall {
    constructor(stream, headers, callEventTracker, handler, options) {
        var _a;
        this.stream = stream;
        this.callEventTracker = callEventTracker;
        this.handler = handler;
        this.listener = null;
        this.deadlineTimer = null;
        this.deadline = Infinity;
        this.maxSendMessageSize = constants_1.DEFAULT_MAX_SEND_MESSAGE_LENGTH;
        this.maxReceiveMessageSize = constants_1.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
        this.cancelled = false;
        this.metadataSent = false;
        this.wantTrailers = false;
        this.cancelNotified = false;
        this.incomingEncoding = 'identity';
        this.readQueue = [];
        this.isReadPending = false;
        this.receivedHalfClose = false;
        this.streamEnded = false;
        this.stream.once('error', (err) => {
            /* We need an error handler to avoid uncaught error event exceptions, but
             * there is nothing we can reasonably do here. Any error event should
             * have a corresponding close event, which handles emitting the cancelled
             * event. And the stream is now in a bad state, so we can't reasonably
             * expect to be able to send an error over it. */
        });
        this.stream.once('close', () => {
            var _a;
            trace('Request to method ' +
                ((_a = this.handler) === null || _a === void 0 ? void 0 : _a.path) +
                ' stream closed with rstCode ' +
                this.stream.rstCode);
            if (this.callEventTracker && !this.streamEnded) {
                this.streamEnded = true;
                this.callEventTracker.onStreamEnd(false);
                this.callEventTracker.onCallEnd({
                    code: constants_1.Status.CANCELLED,
                    details: 'Stream closed before sending status',
                    metadata: null,
                });
            }
            this.notifyOnCancel();
        });
        this.stream.on('data', (data) => {
            this.handleDataFrame(data);
        });
        this.stream.pause();
        this.stream.on('end', () => {
            this.handleEndEvent();
        });
        if ('grpc.max_send_message_length' in options) {
            this.maxSendMessageSize = options['grpc.max_send_message_length'];
        }
        if ('grpc.max_receive_message_length' in options) {
            this.maxReceiveMessageSize = options['grpc.max_receive_message_length'];
        }
        this.host = (_a = headers[':authority']) !== null && _a !== void 0 ? _a : headers.host;
        this.decoder = new stream_decoder_1.StreamDecoder(this.maxReceiveMessageSize);
        const metadata = metadata_1.Metadata.fromHttp2Headers(headers);
        if (logging.isTracerEnabled(TRACER_NAME)) {
            trace('Request to ' +
                this.handler.path +
                ' received headers ' +
                JSON.stringify(metadata.toJSON()));
        }
        const timeoutHeader = metadata.get(GRPC_TIMEOUT_HEADER);
        if (timeoutHeader.length > 0) {
            this.handleTimeoutHeader(timeoutHeader[0]);
        }
        const encodingHeader = metadata.get(GRPC_ENCODING_HEADER);
        if (encodingHeader.length > 0) {
            this.incomingEncoding = encodingHeader[0];
        }
        // Remove several headers that should not be propagated to the application
        metadata.remove(GRPC_TIMEOUT_HEADER);
        metadata.remove(GRPC_ENCODING_HEADER);
        metadata.remove(GRPC_ACCEPT_ENCODING_HEADER);
        metadata.remove(http2.constants.HTTP2_HEADER_ACCEPT_ENCODING);
        metadata.remove(http2.constants.HTTP2_HEADER_TE);
        metadata.remove(http2.constants.HTTP2_HEADER_CONTENT_TYPE);
        this.metadata = metadata;
    }
    handleTimeoutHeader(timeoutHeader) {
        const match = timeoutHeader.toString().match(DEADLINE_REGEX);
        if (match === null) {
            const status = {
                code: constants_1.Status.INTERNAL,
                details: `Invalid ${GRPC_TIMEOUT_HEADER} value "${timeoutHeader}"`,
                metadata: null,
            };
            // Wait for the constructor to complete before sending the error.
            process.nextTick(() => {
                this.sendStatus(status);
            });
            return;
        }
        const timeout = (+match[1] * deadlineUnitsToMs[match[2]]) | 0;
        const now = new Date();
        this.deadline = now.setMilliseconds(now.getMilliseconds() + timeout);
        this.deadlineTimer = setTimeout(() => {
            const status = {
                code: constants_1.Status.DEADLINE_EXCEEDED,
                details: 'Deadline exceeded',
                metadata: null,
            };
            this.sendStatus(status);
        }, timeout);
    }
    checkCancelled() {
        /* In some cases the stream can become destroyed before the close event
         * fires. That creates a race condition that this check works around */
        if (!this.cancelled && (this.stream.destroyed || this.stream.closed)) {
            this.notifyOnCancel();
            this.cancelled = true;
        }
        return this.cancelled;
    }
    notifyOnCancel() {
        if (this.cancelNotified) {
            return;
        }
        this.cancelNotified = true;
        this.cancelled = true;
        process.nextTick(() => {
            var _a;
            (_a = this.listener) === null || _a === void 0 ? void 0 : _a.onCancel();
        });
        if (this.deadlineTimer) {
            clearTimeout(this.deadlineTimer);
        }
        // Flush incoming data frames
        this.stream.resume();
    }
    /**
     * A server handler can start sending messages without explicitly sending
     * metadata. In that case, we need to send headers before sending any
     * messages. This function does that if necessary.
     */
    maybeSendMetadata() {
        if (!this.metadataSent) {
            this.sendMetadata(new metadata_1.Metadata());
        }
    }
    /**
     * Serialize a message to a length-delimited byte string.
     * @param value
     * @returns
     */
    serializeMessage(value) {
        const messageBuffer = this.handler.serialize(value);
        const byteLength = messageBuffer.byteLength;
        const output = Buffer.allocUnsafe(byteLength + 5);
        /* Note: response compression is currently not supported, so this
         * compressed bit is always 0. */
        output.writeUInt8(0, 0);
        output.writeUInt32BE(byteLength, 1);
        messageBuffer.copy(output, 5);
        return output;
    }
    decompressMessage(message, encoding) {
        const messageContents = message.subarray(5);
        if (encoding === 'identity') {
            return messageContents;
        }
        else if (encoding === 'deflate' || encoding === 'gzip') {
            let decompresser;
            if (encoding === 'deflate') {
                decompresser = zlib.createInflate();
            }
            else {
                decompresser = zlib.createGunzip();
            }
            return new Promise((resolve, reject) => {
                let totalLength = 0;
                const messageParts = [];
                decompresser.on('data', (chunk) => {
                    messageParts.push(chunk);
                    totalLength += chunk.byteLength;
                    if (this.maxReceiveMessageSize !== -1 && totalLength > this.maxReceiveMessageSize) {
                        decompresser.destroy();
                        reject({
                            code: constants_1.Status.RESOURCE_EXHAUSTED,
                            details: `Received message that decompresses to a size larger than ${this.maxReceiveMessageSize}`
                        });
                    }
                });
                decompresser.on('end', () => {
                    resolve(Buffer.concat(messageParts));
                });
                decompresser.write(messageContents);
                decompresser.end();
            });
        }
        else {
            return Promise.reject({
                code: constants_1.Status.UNIMPLEMENTED,
                details: `Received message compressed with unsupported encoding "${encoding}"`,
            });
        }
    }
    async decompressAndMaybePush(queueEntry) {
        if (queueEntry.type !== 'COMPRESSED') {
            throw new Error(`Invalid queue entry type: ${queueEntry.type}`);
        }
        const compressed = queueEntry.compressedMessage.readUInt8(0) === 1;
        const compressedMessageEncoding = compressed
            ? this.incomingEncoding
            : 'identity';
        let decompressedMessage;
        try {
            decompressedMessage = await this.decompressMessage(queueEntry.compressedMessage, compressedMessageEncoding);
        }
        catch (err) {
            this.sendStatus(err);
            return;
        }
        try {
            queueEntry.parsedMessage = this.handler.deserialize(decompressedMessage);
        }
        catch (err) {
            this.sendStatus({
                code: constants_1.Status.INTERNAL,
                details: `Error deserializing request: ${err.message}`,
            });
            return;
        }
        queueEntry.type = 'READABLE';
        this.maybePushNextMessage();
    }
    maybePushNextMessage() {
        if (this.listener &&
            this.isReadPending &&
            this.readQueue.length > 0 &&
            this.readQueue[0].type !== 'COMPRESSED') {
            this.isReadPending = false;
            const nextQueueEntry = this.readQueue.shift();
            if (nextQueueEntry.type === 'READABLE') {
                this.listener.onReceiveMessage(nextQueueEntry.parsedMessage);
            }
            else {
                // nextQueueEntry.type === 'HALF_CLOSE'
                this.listener.onReceiveHalfClose();
            }
        }
    }
    handleDataFrame(data) {
        var _a;
        if (this.checkCancelled()) {
            return;
        }
        trace('Request to ' +
            this.handler.path +
            ' received data frame of size ' +
            data.length);
        let rawMessages;
        try {
            rawMessages = this.decoder.write(data);
        }
        catch (e) {
            this.sendStatus({ code: constants_1.Status.RESOURCE_EXHAUSTED, details: e.message });
            return;
        }
        for (const messageBytes of rawMessages) {
            this.stream.pause();
            const queueEntry = {
                type: 'COMPRESSED',
                compressedMessage: messageBytes,
                parsedMessage: null,
            };
            this.readQueue.push(queueEntry);
            this.decompressAndMaybePush(queueEntry);
            (_a = this.callEventTracker) === null || _a === void 0 ? void 0 : _a.addMessageReceived();
        }
    }
    handleEndEvent() {
        this.readQueue.push({
            type: 'HALF_CLOSE',
            compressedMessage: null,
            parsedMessage: null,
        });
        this.receivedHalfClose = true;
        this.maybePushNextMessage();
    }
    start(listener) {
        trace('Request to ' + this.handler.path + ' start called');
        if (this.checkCancelled()) {
            return;
        }
        this.listener = listener;
        listener.onReceiveMetadata(this.metadata);
    }
    sendMetadata(metadata) {
        if (this.checkCancelled()) {
            return;
        }
        if (this.metadataSent) {
            return;
        }
        this.metadataSent = true;
        const custom = metadata ? metadata.toHttp2Headers() : null;
        const headers = Object.assign(Object.assign(Object.assign({}, defaultResponseHeaders), defaultCompressionHeaders), custom);
        this.stream.respond(headers, defaultResponseOptions);
    }
    sendMessage(message, callback) {
        if (this.checkCancelled()) {
            return;
        }
        let response;
        try {
            response = this.serializeMessage(message);
        }
        catch (e) {
            this.sendStatus({
                code: constants_1.Status.INTERNAL,
                details: `Error serializing response: ${(0, error_1.getErrorMessage)(e)}`,
                metadata: null,
            });
            return;
        }
        if (this.maxSendMessageSize !== -1 &&
            response.length - 5 > this.maxSendMessageSize) {
            this.sendStatus({
                code: constants_1.Status.RESOURCE_EXHAUSTED,
                details: `Sent message larger than max (${response.length} vs. ${this.maxSendMessageSize})`,
                metadata: null,
            });
            return;
        }
        this.maybeSendMetadata();
        trace('Request to ' +
            this.handler.path +
            ' sent data frame of size ' +
            response.length);
        this.stream.write(response, error => {
            var _a;
            if (error) {
                this.sendStatus({
                    code: constants_1.Status.INTERNAL,
                    details: `Error writing message: ${(0, error_1.getErrorMessage)(error)}`,
                    metadata: null,
                });
                return;
            }
            (_a = this.callEventTracker) === null || _a === void 0 ? void 0 : _a.addMessageSent();
            callback();
        });
    }
    sendStatus(status) {
        var _a, _b;
        if (this.checkCancelled()) {
            return;
        }
        trace('Request to method ' +
            ((_a = this.handler) === null || _a === void 0 ? void 0 : _a.path) +
            ' ended with status code: ' +
            constants_1.Status[status.code] +
            ' details: ' +
            status.details);
        if (this.metadataSent) {
            if (!this.wantTrailers) {
                this.wantTrailers = true;
                this.stream.once('wantTrailers', () => {
                    var _a;
                    if (this.callEventTracker && !this.streamEnded) {
                        this.streamEnded = true;
                        this.callEventTracker.onStreamEnd(true);
                        this.callEventTracker.onCallEnd(status);
                    }
                    const trailersToSend = Object.assign({ [GRPC_STATUS_HEADER]: status.code, [GRPC_MESSAGE_HEADER]: encodeURI(status.details) }, (_a = status.metadata) === null || _a === void 0 ? void 0 : _a.toHttp2Headers());
                    this.stream.sendTrailers(trailersToSend);
                    this.notifyOnCancel();
                });
                this.stream.end();
            }
            else {
                this.notifyOnCancel();
            }
        }
        else {
            if (this.callEventTracker && !this.streamEnded) {
                this.streamEnded = true;
                this.callEventTracker.onStreamEnd(true);
                this.callEventTracker.onCallEnd(status);
            }
            // Trailers-only response
            const trailersToSend = Object.assign(Object.assign({ [GRPC_STATUS_HEADER]: status.code, [GRPC_MESSAGE_HEADER]: encodeURI(status.details) }, defaultResponseHeaders), (_b = status.metadata) === null || _b === void 0 ? void 0 : _b.toHttp2Headers());
            this.stream.respond(trailersToSend, { endStream: true });
            this.notifyOnCancel();
        }
    }
    startRead() {
        trace('Request to ' + this.handler.path + ' startRead called');
        if (this.checkCancelled()) {
            return;
        }
        this.isReadPending = true;
        if (this.readQueue.length === 0) {
            if (!this.receivedHalfClose) {
                this.stream.resume();
            }
        }
        else {
            this.maybePushNextMessage();
        }
    }
    getPeer() {
        var _a;
        const socket = (_a = this.stream.session) === null || _a === void 0 ? void 0 : _a.socket;
        if (socket === null || socket === void 0 ? void 0 : socket.remoteAddress) {
            if (socket.remotePort) {
                return `${socket.remoteAddress}:${socket.remotePort}`;
            }
            else {
                return socket.remoteAddress;
            }
        }
        else {
            return 'unknown';
        }
    }
    getDeadline() {
        return this.deadline;
    }
    getHost() {
        return this.host;
    }
}
exports.BaseServerInterceptingCall = BaseServerInterceptingCall;
function getServerInterceptingCall(interceptors, stream, headers, callEventTracker, handler, options) {
    const methodDefinition = {
        path: handler.path,
        requestStream: handler.type === 'clientStream' || handler.type === 'bidi',
        responseStream: handler.type === 'serverStream' || handler.type === 'bidi',
        requestDeserialize: handler.deserialize,
        responseSerialize: handler.serialize,
    };
    const baseCall = new BaseServerInterceptingCall(stream, headers, callEventTracker, handler, options);
    return interceptors.reduce((call, interceptor) => {
        return interceptor(methodDefinition, call);
    }, baseCall);
}
//# sourceMappingURL=server-interceptors.js.map