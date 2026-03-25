"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorStatusObject = createErrorStatusObject;
const grpc_js_1 = require("@grpc/grpc-js");
const abort_controller_x_1 = require("abort-controller-x");
const nice_grpc_common_1 = require("nice-grpc-common");
/** @internal */
function createErrorStatusObject(path, error, trailer) {
    if (error instanceof nice_grpc_common_1.ServerError) {
        return {
            code: error.code,
            details: error.details,
            metadata: trailer,
        };
    }
    else if ((0, abort_controller_x_1.isAbortError)(error)) {
        return {
            code: grpc_js_1.status.CANCELLED,
            details: 'The operation was cancelled',
            metadata: trailer,
        };
    }
    else {
        process.emitWarning(`${path}: Uncaught error in server implementation method. Server methods should only throw ServerError or AbortError. ${error instanceof Error ? error.stack : error}`);
        return {
            code: grpc_js_1.status.UNKNOWN,
            details: 'Unknown server error occurred',
            metadata: trailer,
        };
    }
}
//# sourceMappingURL=createErrorStatusObject.js.map