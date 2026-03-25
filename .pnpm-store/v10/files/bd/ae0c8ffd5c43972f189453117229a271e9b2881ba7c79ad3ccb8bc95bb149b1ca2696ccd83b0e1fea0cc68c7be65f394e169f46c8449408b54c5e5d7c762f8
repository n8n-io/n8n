"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerStreamingMethodHandler = createServerStreamingMethodHandler;
const abort_controller_x_1 = require("abort-controller-x");
const convertMetadata_1 = require("../utils/convertMetadata");
const isAsyncIterable_1 = require("../utils/isAsyncIterable");
const createCallContext_1 = require("./createCallContext");
const createErrorStatusObject_1 = require("./createErrorStatusObject");
/** @internal */
function createServerStreamingMethodHandler(definition, implementation, middleware) {
    const methodDescriptor = {
        path: definition.path,
        requestStream: definition.requestStream,
        responseStream: definition.responseStream,
        options: definition.options,
    };
    async function* serverStreamingMethodHandler(request, context) {
        if ((0, isAsyncIterable_1.isAsyncIterable)(request)) {
            throw new Error('A middleware passed invalid request to next(): expected a single message for server streaming method');
        }
        yield* implementation(request, context);
    }
    const handler = middleware == null
        ? serverStreamingMethodHandler
        : (request, context) => middleware({
            method: methodDescriptor,
            requestStream: false,
            request,
            responseStream: true,
            next: serverStreamingMethodHandler,
        }, context);
    return call => {
        const { context, maybeCancel } = (0, createCallContext_1.createCallContext)(call);
        Promise.resolve()
            .then(async () => {
            const iterable = handler(call.request, context);
            const iterator = iterable[Symbol.asyncIterator]();
            try {
                let result = await iterator.next();
                while (true) {
                    if (!result.done) {
                        try {
                            context.sendHeader();
                            const shouldContinue = call.write(result.value);
                            if (!shouldContinue) {
                                await (0, abort_controller_x_1.waitForEvent)(context.signal, call, 'drain');
                            }
                        }
                        catch (err) {
                            result = (0, abort_controller_x_1.isAbortError)(err)
                                ? await iterator.return()
                                : await iterator.throw(err);
                            continue;
                        }
                        result = await iterator.next();
                        continue;
                    }
                    if (result.value != null) {
                        result = await iterator.throw(new Error('A middleware returned a message, but expected to return void for server streaming method'));
                        continue;
                    }
                    break;
                }
            }
            finally {
                maybeCancel.cancel = undefined;
                context.sendHeader();
            }
        })
            .then(() => {
            call.end((0, convertMetadata_1.convertMetadataToGrpcJs)(context.trailer));
        }, err => {
            call.emit('error', (0, createErrorStatusObject_1.createErrorStatusObject)(definition.path, err, (0, convertMetadata_1.convertMetadataToGrpcJs)(context.trailer)));
        });
    };
}
//# sourceMappingURL=handleServerStreamingCall.js.map