"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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