"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapClientError = wrapClientError;
const nice_grpc_common_1 = require("nice-grpc-common");
const grpc_js_1 = require("@grpc/grpc-js");
/** @internal */
function wrapClientError(error, path) {
    if (isStatusObject(error)) {
        return new nice_grpc_common_1.ClientError(path, error.code, error.details);
    }
    return error;
}
function isStatusObject(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.code === 'number' &&
        typeof obj.details === 'string' &&
        obj.metadata instanceof grpc_js_1.Metadata);
}
//# sourceMappingURL=wrapClientError.js.map