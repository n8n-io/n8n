"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnaryMethodHandler = createUnaryMethodHandler;
const convertMetadata_1 = require("../utils/convertMetadata");
const isAsyncIterable_1 = require("../utils/isAsyncIterable");
const createCallContext_1 = require("./createCallContext");
const createErrorStatusObject_1 = require("./createErrorStatusObject");
/** @internal */
function createUnaryMethodHandler(definition, implementation, middleware) {
    const methodDescriptor = {
        path: definition.path,
        requestStream: definition.requestStream,
        responseStream: definition.responseStream,
        options: definition.options,
    };
    async function* unaryMethodHandler(request, context) {
        if ((0, isAsyncIterable_1.isAsyncIterable)(request)) {
            throw new Error('A middleware passed invalid request to next(): expected a single message for unary method');
        }
        return await implementation(request, context);
    }
    const handler = middleware == null
        ? unaryMethodHandler
        : (request, context) => middleware({
            method: methodDescriptor,
            requestStream: false,
            request,
            responseStream: false,
            next: unaryMethodHandler,
        }, context);
    return (call, callback) => {
        const { context, maybeCancel } = (0, createCallContext_1.createCallContext)(call);
        Promise.resolve()
            .then(async () => {
            const iterable = handler(call.request, context);
            const iterator = iterable[Symbol.asyncIterator]();
            try {
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
            }
            finally {
                maybeCancel.cancel = undefined;
                context.sendHeader();
            }
        })
            .then(res => {
            callback(null, res, (0, convertMetadata_1.convertMetadataToGrpcJs)(context.trailer));
        }, err => {
            callback((0, createErrorStatusObject_1.createErrorStatusObject)(definition.path, err, (0, convertMetadata_1.convertMetadataToGrpcJs)(context.trailer)));
        });
    };
}
//# sourceMappingURL=handleUnaryCall.js.map