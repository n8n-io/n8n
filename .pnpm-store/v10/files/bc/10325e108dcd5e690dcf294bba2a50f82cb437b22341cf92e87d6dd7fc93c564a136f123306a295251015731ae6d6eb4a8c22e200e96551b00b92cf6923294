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
exports.Client = void 0;
const call_1 = require("./call");
const channel_1 = require("./channel");
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const metadata_1 = require("./metadata");
const client_interceptors_1 = require("./client-interceptors");
const CHANNEL_SYMBOL = Symbol();
const INTERCEPTOR_SYMBOL = Symbol();
const INTERCEPTOR_PROVIDER_SYMBOL = Symbol();
const CALL_INVOCATION_TRANSFORMER_SYMBOL = Symbol();
function isFunction(arg) {
    return typeof arg === 'function';
}
function getErrorStackString(error) {
    var _a;
    return ((_a = error.stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(1).join('\n')) || 'no stack trace available';
}
/**
 * A generic gRPC client. Primarily useful as a base class for all generated
 * clients.
 */
class Client {
    constructor(address, credentials, options = {}) {
        var _a, _b;
        options = Object.assign({}, options);
        this[INTERCEPTOR_SYMBOL] = (_a = options.interceptors) !== null && _a !== void 0 ? _a : [];
        delete options.interceptors;
        this[INTERCEPTOR_PROVIDER_SYMBOL] = (_b = options.interceptor_providers) !== null && _b !== void 0 ? _b : [];
        delete options.interceptor_providers;
        if (this[INTERCEPTOR_SYMBOL].length > 0 &&
            this[INTERCEPTOR_PROVIDER_SYMBOL].length > 0) {
            throw new Error('Both interceptors and interceptor_providers were passed as options ' +
                'to the client constructor. Only one of these is allowed.');
        }
        this[CALL_INVOCATION_TRANSFORMER_SYMBOL] =
            options.callInvocationTransformer;
        delete options.callInvocationTransformer;
        if (options.channelOverride) {
            this[CHANNEL_SYMBOL] = options.channelOverride;
        }
        else if (options.channelFactoryOverride) {
            const channelFactoryOverride = options.channelFactoryOverride;
            delete options.channelFactoryOverride;
            this[CHANNEL_SYMBOL] = channelFactoryOverride(address, credentials, options);
        }
        else {
            this[CHANNEL_SYMBOL] = new channel_1.ChannelImplementation(address, credentials, options);
        }
    }
    close() {
        this[CHANNEL_SYMBOL].close();
    }
    getChannel() {
        return this[CHANNEL_SYMBOL];
    }
    waitForReady(deadline, callback) {
        const checkState = (err) => {
            if (err) {
                callback(new Error('Failed to connect before the deadline'));
                return;
            }
            let newState;
            try {
                newState = this[CHANNEL_SYMBOL].getConnectivityState(true);
            }
            catch (e) {
                callback(new Error('The channel has been closed'));
                return;
            }
            if (newState === connectivity_state_1.ConnectivityState.READY) {
                callback();
            }
            else {
                try {
                    this[CHANNEL_SYMBOL].watchConnectivityState(newState, deadline, checkState);
                }
                catch (e) {
                    callback(new Error('The channel has been closed'));
                }
            }
        };
        setImmediate(checkState);
    }
    checkOptionalUnaryResponseArguments(arg1, arg2, arg3) {
        if (isFunction(arg1)) {
            return { metadata: new metadata_1.Metadata(), options: {}, callback: arg1 };
        }
        else if (isFunction(arg2)) {
            if (arg1 instanceof metadata_1.Metadata) {
                return { metadata: arg1, options: {}, callback: arg2 };
            }
            else {
                return { metadata: new metadata_1.Metadata(), options: arg1, callback: arg2 };
            }
        }
        else {
            if (!(arg1 instanceof metadata_1.Metadata &&
                arg2 instanceof Object &&
                isFunction(arg3))) {
                throw new Error('Incorrect arguments passed');
            }
            return { metadata: arg1, options: arg2, callback: arg3 };
        }
    }
    makeUnaryRequest(method, serialize, deserialize, argument, metadata, options, callback) {
        var _a, _b;
        const checkedArguments = this.checkOptionalUnaryResponseArguments(metadata, options, callback);
        const methodDefinition = {
            path: method,
            requestStream: false,
            responseStream: false,
            requestSerialize: serialize,
            responseDeserialize: deserialize,
        };
        let callProperties = {
            argument: argument,
            metadata: checkedArguments.metadata,
            call: new call_1.ClientUnaryCallImpl(),
            channel: this[CHANNEL_SYMBOL],
            methodDefinition: methodDefinition,
            callOptions: checkedArguments.options,
            callback: checkedArguments.callback,
        };
        if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL]) {
            callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
        }
        const emitter = callProperties.call;
        const interceptorArgs = {
            clientInterceptors: this[INTERCEPTOR_SYMBOL],
            clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
            callInterceptors: (_a = callProperties.callOptions.interceptors) !== null && _a !== void 0 ? _a : [],
            callInterceptorProviders: (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== void 0 ? _b : [],
        };
        const call = (0, client_interceptors_1.getInterceptingCall)(interceptorArgs, callProperties.methodDefinition, callProperties.callOptions, callProperties.channel);
        /* This needs to happen before the emitter is used. Unfortunately we can't
         * enforce this with the type system. We need to construct this emitter
         * before calling the CallInvocationTransformer, and we need to create the
         * call after that. */
        emitter.call = call;
        let responseMessage = null;
        let receivedStatus = false;
        let callerStackError = new Error();
        call.start(callProperties.metadata, {
            onReceiveMetadata: metadata => {
                emitter.emit('metadata', metadata);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReceiveMessage(message) {
                if (responseMessage !== null) {
                    call.cancelWithStatus(constants_1.Status.UNIMPLEMENTED, 'Too many responses received');
                }
                responseMessage = message;
            },
            onReceiveStatus(status) {
                if (receivedStatus) {
                    return;
                }
                receivedStatus = true;
                if (status.code === constants_1.Status.OK) {
                    if (responseMessage === null) {
                        const callerStack = getErrorStackString(callerStackError);
                        callProperties.callback((0, call_1.callErrorFromStatus)({
                            code: constants_1.Status.UNIMPLEMENTED,
                            details: 'No message received',
                            metadata: status.metadata,
                        }, callerStack));
                    }
                    else {
                        callProperties.callback(null, responseMessage);
                    }
                }
                else {
                    const callerStack = getErrorStackString(callerStackError);
                    callProperties.callback((0, call_1.callErrorFromStatus)(status, callerStack));
                }
                /* Avoid retaining the callerStackError object in the call context of
                 * the status event handler. */
                callerStackError = null;
                emitter.emit('status', status);
            },
        });
        call.sendMessage(argument);
        call.halfClose();
        return emitter;
    }
    makeClientStreamRequest(method, serialize, deserialize, metadata, options, callback) {
        var _a, _b;
        const checkedArguments = this.checkOptionalUnaryResponseArguments(metadata, options, callback);
        const methodDefinition = {
            path: method,
            requestStream: true,
            responseStream: false,
            requestSerialize: serialize,
            responseDeserialize: deserialize,
        };
        let callProperties = {
            metadata: checkedArguments.metadata,
            call: new call_1.ClientWritableStreamImpl(serialize),
            channel: this[CHANNEL_SYMBOL],
            methodDefinition: methodDefinition,
            callOptions: checkedArguments.options,
            callback: checkedArguments.callback,
        };
        if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL]) {
            callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
        }
        const emitter = callProperties.call;
        const interceptorArgs = {
            clientInterceptors: this[INTERCEPTOR_SYMBOL],
            clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
            callInterceptors: (_a = callProperties.callOptions.interceptors) !== null && _a !== void 0 ? _a : [],
            callInterceptorProviders: (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== void 0 ? _b : [],
        };
        const call = (0, client_interceptors_1.getInterceptingCall)(interceptorArgs, callProperties.methodDefinition, callProperties.callOptions, callProperties.channel);
        /* This needs to happen before the emitter is used. Unfortunately we can't
         * enforce this with the type system. We need to construct this emitter
         * before calling the CallInvocationTransformer, and we need to create the
         * call after that. */
        emitter.call = call;
        let responseMessage = null;
        let receivedStatus = false;
        let callerStackError = new Error();
        call.start(callProperties.metadata, {
            onReceiveMetadata: metadata => {
                emitter.emit('metadata', metadata);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReceiveMessage(message) {
                if (responseMessage !== null) {
                    call.cancelWithStatus(constants_1.Status.UNIMPLEMENTED, 'Too many responses received');
                }
                responseMessage = message;
                call.startRead();
            },
            onReceiveStatus(status) {
                if (receivedStatus) {
                    return;
                }
                receivedStatus = true;
                if (status.code === constants_1.Status.OK) {
                    if (responseMessage === null) {
                        const callerStack = getErrorStackString(callerStackError);
                        callProperties.callback((0, call_1.callErrorFromStatus)({
                            code: constants_1.Status.UNIMPLEMENTED,
                            details: 'No message received',
                            metadata: status.metadata,
                        }, callerStack));
                    }
                    else {
                        callProperties.callback(null, responseMessage);
                    }
                }
                else {
                    const callerStack = getErrorStackString(callerStackError);
                    callProperties.callback((0, call_1.callErrorFromStatus)(status, callerStack));
                }
                /* Avoid retaining the callerStackError object in the call context of
                 * the status event handler. */
                callerStackError = null;
                emitter.emit('status', status);
            },
        });
        return emitter;
    }
    checkMetadataAndOptions(arg1, arg2) {
        let metadata;
        let options;
        if (arg1 instanceof metadata_1.Metadata) {
            metadata = arg1;
            if (arg2) {
                options = arg2;
            }
            else {
                options = {};
            }
        }
        else {
            if (arg1) {
                options = arg1;
            }
            else {
                options = {};
            }
            metadata = new metadata_1.Metadata();
        }
        return { metadata, options };
    }
    makeServerStreamRequest(method, serialize, deserialize, argument, metadata, options) {
        var _a, _b;
        const checkedArguments = this.checkMetadataAndOptions(metadata, options);
        const methodDefinition = {
            path: method,
            requestStream: false,
            responseStream: true,
            requestSerialize: serialize,
            responseDeserialize: deserialize,
        };
        let callProperties = {
            argument: argument,
            metadata: checkedArguments.metadata,
            call: new call_1.ClientReadableStreamImpl(deserialize),
            channel: this[CHANNEL_SYMBOL],
            methodDefinition: methodDefinition,
            callOptions: checkedArguments.options,
        };
        if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL]) {
            callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
        }
        const stream = callProperties.call;
        const interceptorArgs = {
            clientInterceptors: this[INTERCEPTOR_SYMBOL],
            clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
            callInterceptors: (_a = callProperties.callOptions.interceptors) !== null && _a !== void 0 ? _a : [],
            callInterceptorProviders: (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== void 0 ? _b : [],
        };
        const call = (0, client_interceptors_1.getInterceptingCall)(interceptorArgs, callProperties.methodDefinition, callProperties.callOptions, callProperties.channel);
        /* This needs to happen before the emitter is used. Unfortunately we can't
         * enforce this with the type system. We need to construct this emitter
         * before calling the CallInvocationTransformer, and we need to create the
         * call after that. */
        stream.call = call;
        let receivedStatus = false;
        let callerStackError = new Error();
        call.start(callProperties.metadata, {
            onReceiveMetadata(metadata) {
                stream.emit('metadata', metadata);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReceiveMessage(message) {
                stream.push(message);
            },
            onReceiveStatus(status) {
                if (receivedStatus) {
                    return;
                }
                receivedStatus = true;
                stream.push(null);
                if (status.code !== constants_1.Status.OK) {
                    const callerStack = getErrorStackString(callerStackError);
                    stream.emit('error', (0, call_1.callErrorFromStatus)(status, callerStack));
                }
                /* Avoid retaining the callerStackError object in the call context of
                 * the status event handler. */
                callerStackError = null;
                stream.emit('status', status);
            },
        });
        call.sendMessage(argument);
        call.halfClose();
        return stream;
    }
    makeBidiStreamRequest(method, serialize, deserialize, metadata, options) {
        var _a, _b;
        const checkedArguments = this.checkMetadataAndOptions(metadata, options);
        const methodDefinition = {
            path: method,
            requestStream: true,
            responseStream: true,
            requestSerialize: serialize,
            responseDeserialize: deserialize,
        };
        let callProperties = {
            metadata: checkedArguments.metadata,
            call: new call_1.ClientDuplexStreamImpl(serialize, deserialize),
            channel: this[CHANNEL_SYMBOL],
            methodDefinition: methodDefinition,
            callOptions: checkedArguments.options,
        };
        if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL]) {
            callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
        }
        const stream = callProperties.call;
        const interceptorArgs = {
            clientInterceptors: this[INTERCEPTOR_SYMBOL],
            clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
            callInterceptors: (_a = callProperties.callOptions.interceptors) !== null && _a !== void 0 ? _a : [],
            callInterceptorProviders: (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== void 0 ? _b : [],
        };
        const call = (0, client_interceptors_1.getInterceptingCall)(interceptorArgs, callProperties.methodDefinition, callProperties.callOptions, callProperties.channel);
        /* This needs to happen before the emitter is used. Unfortunately we can't
         * enforce this with the type system. We need to construct this emitter
         * before calling the CallInvocationTransformer, and we need to create the
         * call after that. */
        stream.call = call;
        let receivedStatus = false;
        let callerStackError = new Error();
        call.start(callProperties.metadata, {
            onReceiveMetadata(metadata) {
                stream.emit('metadata', metadata);
            },
            onReceiveMessage(message) {
                stream.push(message);
            },
            onReceiveStatus(status) {
                if (receivedStatus) {
                    return;
                }
                receivedStatus = true;
                stream.push(null);
                if (status.code !== constants_1.Status.OK) {
                    const callerStack = getErrorStackString(callerStackError);
                    stream.emit('error', (0, call_1.callErrorFromStatus)(status, callerStack));
                }
                /* Avoid retaining the callerStackError object in the call context of
                 * the status event handler. */
                callerStackError = null;
                stream.emit('status', status);
            },
        });
        return stream;
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map