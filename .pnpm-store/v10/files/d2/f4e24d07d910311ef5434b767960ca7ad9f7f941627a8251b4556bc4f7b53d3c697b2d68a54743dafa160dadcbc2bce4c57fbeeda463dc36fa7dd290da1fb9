"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTraceInterceptor = exports.getRetryInterceptor = exports.getMetaInterceptor = exports.getGRPCService = void 0;
const path_1 = __importDefault(require("path"));
const proto_loader_1 = require("@grpc/proto-loader");
const grpc_js_1 = require("@grpc/grpc-js");
const _1 = require(".");
const api_1 = require("@opentelemetry/api");
const const_1 = require("../const");
const sdk_json_1 = __importDefault(require("../../sdk.json"));
/**
 * Returns a gRPC service client constructor for the given proto file and service name.
 * @param proto An object containing the proto file path and service name.
 * @returns A gRPC service client constructor.
 */
const getGRPCService = (proto, options) => {
    // Resolve the proto file path.
    const PROTO_PATH = path_1.default.resolve(__dirname, proto.protoPath);
    // Load the proto file.
    const packageDefinition = (0, proto_loader_1.loadSync)(PROTO_PATH, options);
    // Load the gRPC object.
    const grpcObj = (0, grpc_js_1.loadPackageDefinition)(packageDefinition);
    // Get the service object from the gRPC object.
    const service = proto.serviceName
        .split('.')
        .reduce((a, b) => a[b], grpcObj);
    // Check that the service object is valid.
    if ((service === null || service === void 0 ? void 0 : service.name) !== 'ServiceClientImpl') {
        throw new Error(`Unable to load service: ${proto.serviceName} from ${proto.protoPath}`);
    }
    // Return the service client constructor.
    return service;
};
exports.getGRPCService = getGRPCService;
/**
 * Returns a gRPC interceptor function that adds metadata to outgoing requests.
 *
 * @param {Function} onInvoked - A function to be called with the modified metadata.
 * @param {Object[]} initValues - An array of objects containing key-value pairs to add to the metadata.
 * @returns {Function} The gRPC interceptor function.
 */
const getMetaInterceptor = (onInvoked, initValues = []) => function (options, nextCall) {
    // Create a new InterceptingCall object with nextCall(options) as its first parameter.
    return new grpc_js_1.InterceptingCall(nextCall(options), {
        // Define the start method of the InterceptingCall object.
        start: function (metadata, listener, next) {
            initValues.forEach(obj => {
                Object.entries(obj).forEach(([key, value]) => {
                    metadata.add(key, value);
                });
            });
            if (onInvoked) {
                onInvoked(metadata);
            }
            // Call next(metadata, listener) to continue the call with the modified metadata.
            next(metadata, listener);
        },
    });
};
exports.getMetaInterceptor = getMetaInterceptor;
/**
 * Returns a gRPC interceptor function that retries failed requests up to a maximum number of times.
 *
 * @param {Object} options - The options object.
 * @param {number} options.maxRetries - The maximum number of times to retry a failed request.
 * @param {number} options.retryDelay - The delay in milliseconds between retries.
 * @returns {Function} The gRPC interceptor function.
 */
/* istanbul ignore next */
const getRetryInterceptor = ({ maxRetries = 3, retryDelay = 30, clientId = '', }) => function (options, nextCall) {
    // intermediate variables
    let savedMetadata;
    let savedSendMessage;
    let savedReceiveMessage;
    let savedNext;
    let savedMessageNext;
    let savedStatusNext;
    // get method name
    const methodName = (0, _1.extractMethodName)(options.method_definition.path);
    // for logger
    const startTime = new Date();
    let dbname = '';
    let retryCount = 0;
    // deadline and timeout
    const deadline = options.deadline;
    // retry timeout
    const timeout = deadline.getTime() - startTime.getTime();
    const timeoutInSeconds = timeout / 1000 + 's';
    // make clientId shorter
    clientId = clientId.slice(0, 8) + '...';
    // requester, used to execute method
    let requester = {
        start: function (metadata, listener, next) {
            savedMetadata = metadata;
            savedNext = next;
            // get db name from meta
            dbname = metadata.get('dbname') || const_1.DEFAULT_DB;
            const retryListener = {
                // this will be called before onReceiveStatus
                onReceiveMessage: (message, next) => {
                    // store message for retry call
                    savedReceiveMessage = message;
                    // store next for retry call
                    if (!savedMessageNext) {
                        savedMessageNext = next;
                    }
                },
                // then this will be called
                onReceiveStatus: (status, next) => {
                    // store status for retry call
                    if (!savedStatusNext) {
                        savedStatusNext = next;
                    }
                    // transform code and message if needed(for compatibility with old version of milvus)
                    switch (status.code) {
                        case grpc_js_1.status.UNIMPLEMENTED:
                            savedReceiveMessage = {};
                            status.code = grpc_js_1.status.OK;
                            break;
                    }
                    // check message if need retry
                    const needRetry = (0, _1.isInvalidMessage)(savedReceiveMessage, []) ||
                        !(0, _1.isInIgnoreRetryCodes)(status.code);
                    // check
                    if (needRetry && retryCount < maxRetries) {
                        // increase retry count
                        retryCount++;
                        // retry delay
                        const _retryDelay = Math.pow(2, retryCount) * retryDelay;
                        // logger
                        _1.logger.debug(`\x1b[31m[Response(${Date.now() - startTime.getTime()}ms)]\x1b[0m\x1b[2m${clientId}\x1b[0m>${dbname}>\x1b[1m${methodName}\x1b[0m: ${JSON.stringify(savedReceiveMessage)}`);
                        _1.logger.debug(`\x1b[31m[Retry(${_retryDelay}ms]\x1b[0m\x1b[2m${clientId}\x1b[0m>${dbname}>\x1b[1m${methodName}\x1b[0m:, status: ${JSON.stringify(status)}`);
                        // set new deadline
                        options.deadline = new Date(Date.now() + timeout);
                        // create new call
                        const newCall = nextCall(options);
                        newCall.start(savedMetadata, retryListener);
                        newCall.sendMessage(savedSendMessage);
                    }
                    else {
                        const string = JSON.stringify(savedReceiveMessage);
                        const msg = string.length > 4096 ? string.slice(0, 4096) + '...' : string;
                        _1.logger.debug(`\x1b[32m[Response(${Date.now() - startTime.getTime()}ms)]\x1b[0m\x1b[2m${clientId}\x1b[0m>${dbname}>\x1b[1m${methodName}\x1b[0m: ${msg}`);
                        savedMessageNext(savedReceiveMessage);
                        savedStatusNext(status);
                    }
                },
            };
            savedNext(metadata, retryListener);
        },
        sendMessage: (message, next) => {
            const string = JSON.stringify(message);
            // if string is too big, just show 1000 characters
            const msg = string.length > 4096 ? string.slice(0, 4096) + '...' : string;
            _1.logger.debug(`\x1b[34m[Request]\x1b[0m${clientId}>${dbname}>\x1b[1m${methodName}(${timeoutInSeconds})\x1b[0m: ${msg}`);
            savedSendMessage = message;
            next(message);
        },
    };
    return new grpc_js_1.InterceptingCall(nextCall(options), requester);
};
exports.getRetryInterceptor = getRetryInterceptor;
/**
 * Returns a gRPC interceptor function that adds trace context to outgoing requests.
 */
/* istanbul ignore next */
const getTraceInterceptor = () => {
    // Get the name and version of the client.
    const name = 'milvus-node-client';
    const version = sdk_json_1.default.version;
    // Get the tracer.
    const tracer = api_1.trace.getTracer(name, version);
    return function (options, nextCall) {
        // Create a new InterceptingCall object with nextCall(options) as its first parameter.
        return new grpc_js_1.InterceptingCall(nextCall(options), {
            // Define the start method of the InterceptingCall object.
            start: function (metadata, listener, next) {
                tracer.startActiveSpan('grpc-intercept', (span) => {
                    // Set the span context.
                    const output = {};
                    // Inject the span context into the metadata.
                    api_1.propagation.inject(api_1.context.active(), output);
                    // Add the traceparent and tracestate to the metadata.
                    const { traceparent, tracestate } = output;
                    if (traceparent) {
                        metadata.add('traceparent', traceparent);
                    }
                    if (tracestate) {
                        metadata.add('tracestate', tracestate);
                    }
                    span.end();
                });
                // Call next(metadata, listener) to continue the call with the modified metadata.
                next(metadata, listener);
            },
        });
    };
};
exports.getTraceInterceptor = getTraceInterceptor;
//# sourceMappingURL=Grpc.js.map