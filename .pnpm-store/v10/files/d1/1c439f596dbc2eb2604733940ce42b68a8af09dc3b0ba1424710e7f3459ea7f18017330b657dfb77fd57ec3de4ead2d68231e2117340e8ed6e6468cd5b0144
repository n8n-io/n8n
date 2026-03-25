"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerStreamingMethod = createServerStreamingMethod;
const abort_controller_x_1 = require("abort-controller-x");
const nice_grpc_common_1 = require("nice-grpc-common");
const service_definitions_1 = require("../service-definitions");
const convertMetadata_1 = require("../utils/convertMetadata");
const isAsyncIterable_1 = require("../utils/isAsyncIterable");
const readableToAsyncIterable_1 = require("../utils/readableToAsyncIterable");
const wrapClientError_1 = require("./wrapClientError");
/** @internal */
function createServerStreamingMethod(definition, client, middleware, defaultOptions) {
    const grpcMethodDefinition = (0, service_definitions_1.toGrpcJsMethodDefinition)(definition);
    const methodDescriptor = {
        path: definition.path,
        requestStream: definition.requestStream,
        responseStream: definition.responseStream,
        options: definition.options,
    };
    async function* serverStreamingMethod(request, options) {
        if ((0, isAsyncIterable_1.isAsyncIterable)(request)) {
            throw new Error('A middleware passed invalid request to next(): expected a single message for server streaming method');
        }
        const { metadata = (0, nice_grpc_common_1.Metadata)(), onHeader, onTrailer } = options;
        const signal = options.signal ?? new AbortController().signal;
        const call = client.makeServerStreamRequest(grpcMethodDefinition.path, grpcMethodDefinition.requestSerialize, grpcMethodDefinition.responseDeserialize, request, (0, convertMetadata_1.convertMetadataToGrpcJs)(metadata));
        call.on('metadata', metadata => {
            onHeader?.((0, convertMetadata_1.convertMetadataFromGrpcJs)(metadata));
        });
        call.on('status', status => {
            onTrailer?.((0, convertMetadata_1.convertMetadataFromGrpcJs)(status.metadata));
        });
        const abortListener = () => {
            call.cancel();
        };
        signal.addEventListener('abort', abortListener);
        try {
            yield* (0, readableToAsyncIterable_1.readableToAsyncIterable)(call);
        }
        catch (err) {
            throw (0, wrapClientError_1.wrapClientError)(err, definition.path);
        }
        finally {
            signal.removeEventListener('abort', abortListener);
            (0, abort_controller_x_1.throwIfAborted)(signal);
            call.cancel();
        }
    }
    const method = middleware == null
        ? serverStreamingMethod
        : (request, options) => middleware({
            method: methodDescriptor,
            requestStream: false,
            request,
            responseStream: true,
            next: serverStreamingMethod,
        }, options);
    return (request, options) => {
        const iterable = method(request, {
            ...defaultOptions,
            ...options,
        });
        const iterator = iterable[Symbol.asyncIterator]();
        return {
            [Symbol.asyncIterator]() {
                return {
                    async next() {
                        const result = await iterator.next();
                        if (result.done && result.value != null) {
                            return await iterator.throw(new Error('A middleware returned a message, but expected to return void for server streaming method'));
                        }
                        return result;
                    },
                    return() {
                        return iterator.return();
                    },
                    throw(err) {
                        return iterator.throw(err);
                    },
                };
            },
        };
    };
}
//# sourceMappingURL=createServerStreamingMethod.js.map