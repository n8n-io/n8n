"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceClientConstructor = void 0;
const grpc = require("@grpc/grpc-js");
/**
 * Creates a unary service client constructor that, when instantiated, does not serialize/deserialize anything.
 * Allows for passing in {@link Buffer} directly, serialization can be handled via protobufjs or custom implementations.
 *
 * @param path service path
 * @param name service name
 */
function createServiceClientConstructor(path, name) {
    const serviceDefinition = {
        export: {
            path: path,
            requestStream: false,
            responseStream: false,
            requestSerialize: (arg) => {
                return arg;
            },
            requestDeserialize: (arg) => {
                return arg;
            },
            responseSerialize: (arg) => {
                return arg;
            },
            responseDeserialize: (arg) => {
                return arg;
            },
        },
    };
    return grpc.makeGenericClientConstructor(serviceDefinition, name);
}
exports.createServiceClientConstructor = createServiceClientConstructor;
//# sourceMappingURL=create-service-client-constructor.js.map