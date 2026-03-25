"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const grpc_js_1 = require("@grpc/grpc-js");
const nice_grpc_common_1 = require("nice-grpc-common");
const service_definitions_1 = require("../service-definitions");
const handleBidiStreamingCall_1 = require("./handleBidiStreamingCall");
const handleClientStreamingCall_1 = require("./handleClientStreamingCall");
const handleServerStreamingCall_1 = require("./handleServerStreamingCall");
const handleUnaryCall_1 = require("./handleUnaryCall");
/**
 * Create a new server.
 *
 * @param options Optional channel options.
 * @returns The new server.
 */
function createServer(options = {}) {
    return createServerWithMiddleware(options);
}
function createServerWithMiddleware(options, middleware) {
    const services = [];
    let server;
    function createAddBuilder(middleware) {
        return {
            with(newMiddleware) {
                return createAddBuilder(middleware == null
                    ? newMiddleware
                    : (0, nice_grpc_common_1.composeServerMiddleware)(middleware, newMiddleware));
            },
            add(definition, implementation) {
                if (server != null) {
                    throw new Error('server.add() must be used before listen()');
                }
                services.push({
                    definition: (0, service_definitions_1.normalizeServiceDefinition)(definition),
                    middleware,
                    implementation,
                });
            },
        };
    }
    return {
        use(newMiddleware) {
            if (server != null) {
                throw new Error('server.use() must be used before listen()');
            }
            if (services.length > 0) {
                throw new Error('server.use() must be used before adding any services');
            }
            return createServerWithMiddleware(options, middleware == null
                ? newMiddleware
                : (0, nice_grpc_common_1.composeServerMiddleware)(middleware, newMiddleware));
        },
        ...createAddBuilder(middleware),
        async listen(address, credentials) {
            if (server != null) {
                throw new Error('server.listen() has already been called');
            }
            server = new grpc_js_1.Server(options);
            for (const { definition, middleware, implementation } of services) {
                const grpcImplementation = {};
                for (const [methodName, methodDefinition] of Object.entries(definition)) {
                    const methodImplementation = implementation[methodName].bind(implementation);
                    if (!methodDefinition.requestStream) {
                        if (!methodDefinition.responseStream) {
                            grpcImplementation[methodName] = (0, handleUnaryCall_1.createUnaryMethodHandler)(methodDefinition, methodImplementation, middleware);
                        }
                        else {
                            grpcImplementation[methodName] =
                                (0, handleServerStreamingCall_1.createServerStreamingMethodHandler)(methodDefinition, methodImplementation, middleware);
                        }
                    }
                    else {
                        if (!methodDefinition.responseStream) {
                            grpcImplementation[methodName] =
                                (0, handleClientStreamingCall_1.createClientStreamingMethodHandler)(methodDefinition, methodImplementation, middleware);
                        }
                        else {
                            grpcImplementation[methodName] = (0, handleBidiStreamingCall_1.createBidiStreamingMethodHandler)(methodDefinition, methodImplementation, middleware);
                        }
                    }
                }
                server.addService((0, service_definitions_1.toGrpcJsServiceDefinition)(definition), grpcImplementation);
            }
            const port = await new Promise((resolve, reject) => {
                server.bindAsync(address, credentials ?? grpc_js_1.ServerCredentials.createInsecure(), (err, port) => {
                    if (err != null) {
                        server = undefined;
                        reject(err);
                    }
                    else {
                        resolve(port);
                    }
                });
            });
            return port;
        },
        async shutdown() {
            if (server == null) {
                return;
            }
            await new Promise((resolve, reject) => {
                server.tryShutdown(err => {
                    if (err != null) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            server = undefined;
        },
        forceShutdown() {
            if (server == null) {
                return;
            }
            server.forceShutdown();
            server = undefined;
        },
    };
}
//# sourceMappingURL=Server.js.map