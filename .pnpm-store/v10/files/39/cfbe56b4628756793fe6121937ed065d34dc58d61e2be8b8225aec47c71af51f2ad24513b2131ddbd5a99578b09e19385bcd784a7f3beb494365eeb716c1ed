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
exports.makeClientConstructor = makeClientConstructor;
exports.loadPackageDefinition = loadPackageDefinition;
const client_1 = require("./client");
/**
 * Map with short names for each of the requester maker functions. Used in
 * makeClientConstructor
 * @private
 */
const requesterFuncs = {
    unary: client_1.Client.prototype.makeUnaryRequest,
    server_stream: client_1.Client.prototype.makeServerStreamRequest,
    client_stream: client_1.Client.prototype.makeClientStreamRequest,
    bidi: client_1.Client.prototype.makeBidiStreamRequest,
};
/**
 * Returns true, if given key is included in the blacklisted
 * keys.
 * @param key key for check, string.
 */
function isPrototypePolluted(key) {
    return ['__proto__', 'prototype', 'constructor'].includes(key);
}
/**
 * Creates a constructor for a client with the given methods, as specified in
 * the methods argument. The resulting class will have an instance method for
 * each method in the service, which is a partial application of one of the
 * [Client]{@link grpc.Client} request methods, depending on `requestSerialize`
 * and `responseSerialize`, with the `method`, `serialize`, and `deserialize`
 * arguments predefined.
 * @param methods An object mapping method names to
 *     method attributes
 * @param serviceName The fully qualified name of the service
 * @param classOptions An options object.
 * @return New client constructor, which is a subclass of
 *     {@link grpc.Client}, and has the same arguments as that constructor.
 */
function makeClientConstructor(methods, serviceName, classOptions) {
    if (!classOptions) {
        classOptions = {};
    }
    class ServiceClientImpl extends client_1.Client {
    }
    Object.keys(methods).forEach(name => {
        if (isPrototypePolluted(name)) {
            return;
        }
        const attrs = methods[name];
        let methodType;
        // TODO(murgatroid99): Verify that we don't need this anymore
        if (typeof name === 'string' && name.charAt(0) === '$') {
            throw new Error('Method names cannot start with $');
        }
        if (attrs.requestStream) {
            if (attrs.responseStream) {
                methodType = 'bidi';
            }
            else {
                methodType = 'client_stream';
            }
        }
        else {
            if (attrs.responseStream) {
                methodType = 'server_stream';
            }
            else {
                methodType = 'unary';
            }
        }
        const serialize = attrs.requestSerialize;
        const deserialize = attrs.responseDeserialize;
        const methodFunc = partial(requesterFuncs[methodType], attrs.path, serialize, deserialize);
        ServiceClientImpl.prototype[name] = methodFunc;
        // Associate all provided attributes with the method
        Object.assign(ServiceClientImpl.prototype[name], attrs);
        if (attrs.originalName && !isPrototypePolluted(attrs.originalName)) {
            ServiceClientImpl.prototype[attrs.originalName] =
                ServiceClientImpl.prototype[name];
        }
    });
    ServiceClientImpl.service = methods;
    ServiceClientImpl.serviceName = serviceName;
    return ServiceClientImpl;
}
function partial(fn, path, serialize, deserialize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (...args) {
        return fn.call(this, path, serialize, deserialize, ...args);
    };
}
function isProtobufTypeDefinition(obj) {
    return 'format' in obj;
}
/**
 * Load a gRPC package definition as a gRPC object hierarchy.
 * @param packageDef The package definition object.
 * @return The resulting gRPC object.
 */
function loadPackageDefinition(packageDef) {
    const result = {};
    for (const serviceFqn in packageDef) {
        if (Object.prototype.hasOwnProperty.call(packageDef, serviceFqn)) {
            const service = packageDef[serviceFqn];
            const nameComponents = serviceFqn.split('.');
            if (nameComponents.some((comp) => isPrototypePolluted(comp))) {
                continue;
            }
            const serviceName = nameComponents[nameComponents.length - 1];
            let current = result;
            for (const packageName of nameComponents.slice(0, -1)) {
                if (!current[packageName]) {
                    current[packageName] = {};
                }
                current = current[packageName];
            }
            if (isProtobufTypeDefinition(service)) {
                current[serviceName] = service;
            }
            else {
                current[serviceName] = makeClientConstructor(service, serviceName, {});
            }
        }
    }
    return result;
}
//# sourceMappingURL=make-client.js.map