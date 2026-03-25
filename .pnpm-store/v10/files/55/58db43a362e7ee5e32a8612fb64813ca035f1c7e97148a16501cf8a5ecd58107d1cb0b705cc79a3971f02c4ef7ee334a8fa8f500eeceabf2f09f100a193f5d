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
exports.InterceptingCall = exports.RequesterBuilder = exports.ListenerBuilder = exports.InterceptorConfigurationError = void 0;
exports.getInterceptingCall = getInterceptingCall;
const metadata_1 = require("./metadata");
const call_interface_1 = require("./call-interface");
const constants_1 = require("./constants");
const error_1 = require("./error");
/**
 * Error class associated with passing both interceptors and interceptor
 * providers to a client constructor or as call options.
 */
class InterceptorConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InterceptorConfigurationError';
        Error.captureStackTrace(this, InterceptorConfigurationError);
    }
}
exports.InterceptorConfigurationError = InterceptorConfigurationError;
class ListenerBuilder {
    constructor() {
        this.metadata = undefined;
        this.message = undefined;
        this.status = undefined;
    }
    withOnReceiveMetadata(onReceiveMetadata) {
        this.metadata = onReceiveMetadata;
        return this;
    }
    withOnReceiveMessage(onReceiveMessage) {
        this.message = onReceiveMessage;
        return this;
    }
    withOnReceiveStatus(onReceiveStatus) {
        this.status = onReceiveStatus;
        return this;
    }
    build() {
        return {
            onReceiveMetadata: this.metadata,
            onReceiveMessage: this.message,
            onReceiveStatus: this.status,
        };
    }
}
exports.ListenerBuilder = ListenerBuilder;
class RequesterBuilder {
    constructor() {
        this.start = undefined;
        this.message = undefined;
        this.halfClose = undefined;
        this.cancel = undefined;
    }
    withStart(start) {
        this.start = start;
        return this;
    }
    withSendMessage(sendMessage) {
        this.message = sendMessage;
        return this;
    }
    withHalfClose(halfClose) {
        this.halfClose = halfClose;
        return this;
    }
    withCancel(cancel) {
        this.cancel = cancel;
        return this;
    }
    build() {
        return {
            start: this.start,
            sendMessage: this.message,
            halfClose: this.halfClose,
            cancel: this.cancel,
        };
    }
}
exports.RequesterBuilder = RequesterBuilder;
/**
 * A Listener with a default pass-through implementation of each method. Used
 * for filling out Listeners with some methods omitted.
 */
const defaultListener = {
    onReceiveMetadata: (metadata, next) => {
        next(metadata);
    },
    onReceiveMessage: (message, next) => {
        next(message);
    },
    onReceiveStatus: (status, next) => {
        next(status);
    },
};
/**
 * A Requester with a default pass-through implementation of each method. Used
 * for filling out Requesters with some methods omitted.
 */
const defaultRequester = {
    start: (metadata, listener, next) => {
        next(metadata, listener);
    },
    sendMessage: (message, next) => {
        next(message);
    },
    halfClose: next => {
        next();
    },
    cancel: next => {
        next();
    },
};
class InterceptingCall {
    constructor(nextCall, requester) {
        var _a, _b, _c, _d;
        this.nextCall = nextCall;
        /**
         * Indicates that metadata has been passed to the requester's start
         * method but it has not been passed to the corresponding next callback
         */
        this.processingMetadata = false;
        /**
         * Message context for a pending message that is waiting for
         */
        this.pendingMessageContext = null;
        /**
         * Indicates that a message has been passed to the requester's sendMessage
         * method but it has not been passed to the corresponding next callback
         */
        this.processingMessage = false;
        /**
         * Indicates that a status was received but could not be propagated because
         * a message was still being processed.
         */
        this.pendingHalfClose = false;
        if (requester) {
            this.requester = {
                start: (_a = requester.start) !== null && _a !== void 0 ? _a : defaultRequester.start,
                sendMessage: (_b = requester.sendMessage) !== null && _b !== void 0 ? _b : defaultRequester.sendMessage,
                halfClose: (_c = requester.halfClose) !== null && _c !== void 0 ? _c : defaultRequester.halfClose,
                cancel: (_d = requester.cancel) !== null && _d !== void 0 ? _d : defaultRequester.cancel,
            };
        }
        else {
            this.requester = defaultRequester;
        }
    }
    cancelWithStatus(status, details) {
        this.requester.cancel(() => {
            this.nextCall.cancelWithStatus(status, details);
        });
    }
    getPeer() {
        return this.nextCall.getPeer();
    }
    processPendingMessage() {
        if (this.pendingMessageContext) {
            this.nextCall.sendMessageWithContext(this.pendingMessageContext, this.pendingMessage);
            this.pendingMessageContext = null;
            this.pendingMessage = null;
        }
    }
    processPendingHalfClose() {
        if (this.pendingHalfClose) {
            this.nextCall.halfClose();
        }
    }
    start(metadata, interceptingListener) {
        var _a, _b, _c, _d, _e, _f;
        const fullInterceptingListener = {
            onReceiveMetadata: (_b = (_a = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveMetadata) === null || _a === void 0 ? void 0 : _a.bind(interceptingListener)) !== null && _b !== void 0 ? _b : (metadata => { }),
            onReceiveMessage: (_d = (_c = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveMessage) === null || _c === void 0 ? void 0 : _c.bind(interceptingListener)) !== null && _d !== void 0 ? _d : (message => { }),
            onReceiveStatus: (_f = (_e = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveStatus) === null || _e === void 0 ? void 0 : _e.bind(interceptingListener)) !== null && _f !== void 0 ? _f : (status => { }),
        };
        this.processingMetadata = true;
        this.requester.start(metadata, fullInterceptingListener, (md, listener) => {
            var _a, _b, _c;
            this.processingMetadata = false;
            let finalInterceptingListener;
            if ((0, call_interface_1.isInterceptingListener)(listener)) {
                finalInterceptingListener = listener;
            }
            else {
                const fullListener = {
                    onReceiveMetadata: (_a = listener.onReceiveMetadata) !== null && _a !== void 0 ? _a : defaultListener.onReceiveMetadata,
                    onReceiveMessage: (_b = listener.onReceiveMessage) !== null && _b !== void 0 ? _b : defaultListener.onReceiveMessage,
                    onReceiveStatus: (_c = listener.onReceiveStatus) !== null && _c !== void 0 ? _c : defaultListener.onReceiveStatus,
                };
                finalInterceptingListener = new call_interface_1.InterceptingListenerImpl(fullListener, fullInterceptingListener);
            }
            this.nextCall.start(md, finalInterceptingListener);
            this.processPendingMessage();
            this.processPendingHalfClose();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessageWithContext(context, message) {
        this.processingMessage = true;
        this.requester.sendMessage(message, finalMessage => {
            this.processingMessage = false;
            if (this.processingMetadata) {
                this.pendingMessageContext = context;
                this.pendingMessage = message;
            }
            else {
                this.nextCall.sendMessageWithContext(context, finalMessage);
                this.processPendingHalfClose();
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessage(message) {
        this.sendMessageWithContext({}, message);
    }
    startRead() {
        this.nextCall.startRead();
    }
    halfClose() {
        this.requester.halfClose(() => {
            if (this.processingMetadata || this.processingMessage) {
                this.pendingHalfClose = true;
            }
            else {
                this.nextCall.halfClose();
            }
        });
    }
}
exports.InterceptingCall = InterceptingCall;
function getCall(channel, path, options) {
    var _a, _b;
    const deadline = (_a = options.deadline) !== null && _a !== void 0 ? _a : Infinity;
    const host = options.host;
    const parent = (_b = options.parent) !== null && _b !== void 0 ? _b : null;
    const propagateFlags = options.propagate_flags;
    const credentials = options.credentials;
    const call = channel.createCall(path, deadline, host, parent, propagateFlags);
    if (credentials) {
        call.setCredentials(credentials);
    }
    return call;
}
/**
 * InterceptingCall implementation that directly owns the underlying Call
 * object and handles serialization and deseraizliation.
 */
class BaseInterceptingCall {
    constructor(call, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    methodDefinition) {
        this.call = call;
        this.methodDefinition = methodDefinition;
    }
    cancelWithStatus(status, details) {
        this.call.cancelWithStatus(status, details);
    }
    getPeer() {
        return this.call.getPeer();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessageWithContext(context, message) {
        let serialized;
        try {
            serialized = this.methodDefinition.requestSerialize(message);
        }
        catch (e) {
            this.call.cancelWithStatus(constants_1.Status.INTERNAL, `Request message serialization failure: ${(0, error_1.getErrorMessage)(e)}`);
            return;
        }
        this.call.sendMessageWithContext(context, serialized);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMessage(message) {
        this.sendMessageWithContext({}, message);
    }
    start(metadata, interceptingListener) {
        let readError = null;
        this.call.start(metadata, {
            onReceiveMetadata: metadata => {
                var _a;
                (_a = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveMetadata) === null || _a === void 0 ? void 0 : _a.call(interceptingListener, metadata);
            },
            onReceiveMessage: message => {
                var _a;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let deserialized;
                try {
                    deserialized = this.methodDefinition.responseDeserialize(message);
                }
                catch (e) {
                    readError = {
                        code: constants_1.Status.INTERNAL,
                        details: `Response message parsing error: ${(0, error_1.getErrorMessage)(e)}`,
                        metadata: new metadata_1.Metadata(),
                    };
                    this.call.cancelWithStatus(readError.code, readError.details);
                    return;
                }
                (_a = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveMessage) === null || _a === void 0 ? void 0 : _a.call(interceptingListener, deserialized);
            },
            onReceiveStatus: status => {
                var _a, _b;
                if (readError) {
                    (_a = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveStatus) === null || _a === void 0 ? void 0 : _a.call(interceptingListener, readError);
                }
                else {
                    (_b = interceptingListener === null || interceptingListener === void 0 ? void 0 : interceptingListener.onReceiveStatus) === null || _b === void 0 ? void 0 : _b.call(interceptingListener, status);
                }
            },
        });
    }
    startRead() {
        this.call.startRead();
    }
    halfClose() {
        this.call.halfClose();
    }
}
/**
 * BaseInterceptingCall with special-cased behavior for methods with unary
 * responses.
 */
class BaseUnaryInterceptingCall extends BaseInterceptingCall {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(call, methodDefinition) {
        super(call, methodDefinition);
    }
    start(metadata, listener) {
        var _a, _b;
        let receivedMessage = false;
        const wrapperListener = {
            onReceiveMetadata: (_b = (_a = listener === null || listener === void 0 ? void 0 : listener.onReceiveMetadata) === null || _a === void 0 ? void 0 : _a.bind(listener)) !== null && _b !== void 0 ? _b : (metadata => { }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReceiveMessage: (message) => {
                var _a;
                receivedMessage = true;
                (_a = listener === null || listener === void 0 ? void 0 : listener.onReceiveMessage) === null || _a === void 0 ? void 0 : _a.call(listener, message);
            },
            onReceiveStatus: (status) => {
                var _a, _b;
                if (!receivedMessage) {
                    (_a = listener === null || listener === void 0 ? void 0 : listener.onReceiveMessage) === null || _a === void 0 ? void 0 : _a.call(listener, null);
                }
                (_b = listener === null || listener === void 0 ? void 0 : listener.onReceiveStatus) === null || _b === void 0 ? void 0 : _b.call(listener, status);
            },
        };
        super.start(metadata, wrapperListener);
        this.call.startRead();
    }
}
/**
 * BaseInterceptingCall with special-cased behavior for methods with streaming
 * responses.
 */
class BaseStreamingInterceptingCall extends BaseInterceptingCall {
}
function getBottomInterceptingCall(channel, options, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
methodDefinition) {
    const call = getCall(channel, methodDefinition.path, options);
    if (methodDefinition.responseStream) {
        return new BaseStreamingInterceptingCall(call, methodDefinition);
    }
    else {
        return new BaseUnaryInterceptingCall(call, methodDefinition);
    }
}
function getInterceptingCall(interceptorArgs, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
methodDefinition, options, channel) {
    if (interceptorArgs.clientInterceptors.length > 0 &&
        interceptorArgs.clientInterceptorProviders.length > 0) {
        throw new InterceptorConfigurationError('Both interceptors and interceptor_providers were passed as options ' +
            'to the client constructor. Only one of these is allowed.');
    }
    if (interceptorArgs.callInterceptors.length > 0 &&
        interceptorArgs.callInterceptorProviders.length > 0) {
        throw new InterceptorConfigurationError('Both interceptors and interceptor_providers were passed as call ' +
            'options. Only one of these is allowed.');
    }
    let interceptors = [];
    // Interceptors passed to the call override interceptors passed to the client constructor
    if (interceptorArgs.callInterceptors.length > 0 ||
        interceptorArgs.callInterceptorProviders.length > 0) {
        interceptors = []
            .concat(interceptorArgs.callInterceptors, interceptorArgs.callInterceptorProviders.map(provider => provider(methodDefinition)))
            .filter(interceptor => interceptor);
        // Filter out falsy values when providers return nothing
    }
    else {
        interceptors = []
            .concat(interceptorArgs.clientInterceptors, interceptorArgs.clientInterceptorProviders.map(provider => provider(methodDefinition)))
            .filter(interceptor => interceptor);
        // Filter out falsy values when providers return nothing
    }
    const interceptorOptions = Object.assign({}, options, {
        method_definition: methodDefinition,
    });
    /* For each interceptor in the list, the nextCall function passed to it is
     * based on the next interceptor in the list, using a nextCall function
     * constructed with the following interceptor in the list, and so on. The
     * initialValue, which is effectively at the end of the list, is a nextCall
     * function that invokes getBottomInterceptingCall, the result of which
     * handles (de)serialization and also gets the underlying call from the
     * channel. */
    const getCall = interceptors.reduceRight((nextCall, nextInterceptor) => {
        return currentOptions => nextInterceptor(currentOptions, nextCall);
    }, (finalOptions) => getBottomInterceptingCall(channel, finalOptions, methodDefinition));
    return getCall(interceptorOptions);
}
//# sourceMappingURL=client-interceptors.js.map