"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnaryMethod = createUnaryMethod;
const abort_controller_x_1 = require("abort-controller-x");
const nice_grpc_common_1 = require("nice-grpc-common");
const service_definitions_1 = require("../service-definitions");
const convertMetadata_1 = require("../utils/convertMetadata");
const isAsyncIterable_1 = require("../utils/isAsyncIterable");
const wrapClientError_1 = require("./wrapClientError");
/** @internal */
function createUnaryMethod(definition, client, middleware, defaultOptions) {
    const grpcMethodDefinition = (0, service_definitions_1.toGrpcJsMethodDefinition)(definition);
    const methodDescriptor = {
        path: definition.path,
        requestStream: definition.requestStream,
        responseStream: definition.responseStream,
        options: definition.options,
    };
    async function* unaryMethod(request, options) {
        if ((0, isAsyncIterable_1.isAsyncIterable)(request)) {
            throw new Error('A middleware passed invalid request to next(): expected a single message for unary method');
        }
        const { metadata = (0, nice_grpc_common_1.Metadata)(), signal = new AbortController().signal, onHeader, onTrailer, } = options;
        return await (0, abort_controller_x_1.execute)(signal, (resolve, reject) => {
            const call = client.makeUnaryRequest(grpcMethodDefinition.path, grpcMethodDefinition.requestSerialize, grpcMethodDefinition.responseDeserialize, request, (0, convertMetadata_1.convertMetadataToGrpcJs)(metadata), (err, response) => {
                if (err != null) {
                    reject((0, wrapClientError_1.wrapClientError)(err, definition.path));
                }
                else {
                    resolve(response);
                }
            });
            call.on('metadata', metadata => {
                onHeader?.((0, convertMetadata_1.convertMetadataFromGrpcJs)(metadata));
            });
            call.on('status', status => {
                onTrailer?.((0, convertMetadata_1.convertMetadataFromGrpcJs)(status.metadata));
            });
            return () => {
                call.cancel();
            };
        });
    }
    const method = middleware == null
        ? unaryMethod
        : (request, options) => middleware({
            method: methodDescriptor,
            requestStream: false,
            request,
            responseStream: false,
            next: unaryMethod,
        }, options);
    return async (request, options) => {
        const iterable = method(request, {
            ...defaultOptions,
            ...options,
        });
        const iterator = iterable[Symbol.asyncIterator]();
        let result = await iterator.next();
        while (true) {
            if (!result.done) {
                result = await iterator.throw(new Error('A middleware yielded a message, but expected to only return a message for unary method'));
                continue;
            }
            if (result.value == null) {
                result = await iterator.throw(new Error('A middleware returned void, but expected to return a message for unary method'));
                continue;
            }
            return result.value;
        }
    };
}
//# sourceMappingURL=createUnaryMethod.js.map