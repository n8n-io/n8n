"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientFactory = createClientFactory;
exports.createClient = createClient;
const grpc_js_1 = require("@grpc/grpc-js");
const nice_grpc_common_1 = require("nice-grpc-common");
const service_definitions_1 = require("../service-definitions");
const createBidiStreamingMethod_1 = require("./createBidiStreamingMethod");
const createClientStreamingMethod_1 = require("./createClientStreamingMethod");
const createServerStreamingMethod_1 = require("./createServerStreamingMethod");
const createUnaryMethod_1 = require("./createUnaryMethod");
/**
 * Create a client factory that can be used to create clients with middleware.
 */
function createClientFactory() {
    return createClientFactoryWithMiddleware();
}
/**
 * Create a client with no middleware.
 *
 * This is the same as calling `createClientFactory().create()`.
 */
function createClient(definition, channel, defaultCallOptions) {
    return createClientFactory().create(definition, channel, defaultCallOptions);
}
function createClientFactoryWithMiddleware(middleware) {
    return {
        use(newMiddleware) {
            return createClientFactoryWithMiddleware(middleware == null
                ? newMiddleware
                : (0, nice_grpc_common_1.composeClientMiddleware)(middleware, newMiddleware));
        },
        create(definition, channel, defaultCallOptions = {}) {
            const constructor = (0, grpc_js_1.makeClientConstructor)({}, '');
            const grpcClient = new constructor('', null, {
                channelOverride: channel,
            });
            const client = {};
            const methodEntries = Object.entries((0, service_definitions_1.normalizeServiceDefinition)(definition));
            for (const [methodName, methodDefinition] of methodEntries) {
                const defaultOptions = {
                    ...defaultCallOptions['*'],
                    ...defaultCallOptions[methodName],
                };
                if (!methodDefinition.requestStream) {
                    if (!methodDefinition.responseStream) {
                        client[methodName] = (0, createUnaryMethod_1.createUnaryMethod)(methodDefinition, grpcClient, middleware, defaultOptions);
                    }
                    else {
                        client[methodName] = (0, createServerStreamingMethod_1.createServerStreamingMethod)(methodDefinition, grpcClient, middleware, defaultOptions);
                    }
                }
                else {
                    if (!methodDefinition.responseStream) {
                        client[methodName] = (0, createClientStreamingMethod_1.createClientStreamingMethod)(methodDefinition, grpcClient, middleware, defaultOptions);
                    }
                    else {
                        client[methodName] = (0, createBidiStreamingMethod_1.createBidiStreamingMethod)(methodDefinition, grpcClient, middleware, defaultOptions);
                    }
                }
            }
            return client;
        },
    };
}
//# sourceMappingURL=ClientFactory.js.map