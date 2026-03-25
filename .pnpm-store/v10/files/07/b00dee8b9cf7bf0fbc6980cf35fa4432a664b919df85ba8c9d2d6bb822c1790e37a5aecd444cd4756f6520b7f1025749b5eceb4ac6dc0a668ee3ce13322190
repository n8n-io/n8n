"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromGrpcJsServiceDefinition = fromGrpcJsServiceDefinition;
exports.isGrpcJsServiceDefinition = isGrpcJsServiceDefinition;
function fromGrpcJsServiceDefinition(definition) {
    const result = {};
    for (const [key, method] of Object.entries(definition)) {
        result[key] = {
            path: method.path,
            requestStream: method.requestStream,
            responseStream: method.responseStream,
            requestDeserialize: bytes => method.requestDeserialize(Buffer.from(bytes)),
            requestSerialize: method.requestSerialize,
            responseDeserialize: bytes => method.responseDeserialize(Buffer.from(bytes)),
            responseSerialize: method.responseSerialize,
            options: {},
        };
    }
    return result;
}
function isGrpcJsServiceDefinition(definition) {
    return Object.values(definition).every(value => typeof value === 'object' &&
        value != null &&
        typeof value.path === 'string');
}
//# sourceMappingURL=grpc-js.js.map