"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeServiceDefinition = normalizeServiceDefinition;
exports.toGrpcJsServiceDefinition = toGrpcJsServiceDefinition;
exports.toGrpcJsMethodDefinition = toGrpcJsMethodDefinition;
const grpc_js_1 = require("./grpc-js");
const ts_proto_1 = require("./ts-proto");
/** @internal */
function normalizeServiceDefinition(definition) {
    if ((0, grpc_js_1.isGrpcJsServiceDefinition)(definition)) {
        return (0, grpc_js_1.fromGrpcJsServiceDefinition)(definition);
    }
    else if ((0, ts_proto_1.isTsProtoServiceDefinition)(definition)) {
        return (0, ts_proto_1.fromTsProtoServiceDefinition)(definition);
    }
    else {
        return definition;
    }
}
/** @internal */
function toGrpcJsServiceDefinition(definition) {
    const result = {};
    for (const [key, method] of Object.entries(definition)) {
        result[key] = toGrpcJsMethodDefinition(method);
    }
    return result;
}
/** @internal */
function toGrpcJsMethodDefinition(definition) {
    return {
        path: definition.path,
        requestStream: definition.requestStream,
        responseStream: definition.responseStream,
        requestDeserialize: definition.requestDeserialize,
        requestSerialize: value => Buffer.from(definition.requestSerialize(value)),
        responseDeserialize: definition.responseDeserialize,
        responseSerialize: value => Buffer.from(definition.responseSerialize(value)),
    };
}
//# sourceMappingURL=index.js.map