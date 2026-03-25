"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = void 0;
const ts_error_1 = require("ts-error");
const Status_1 = require("../Status");
/**
 * Represents gRPC errors returned from client calls.
 */
class ClientError extends ts_error_1.ExtendableError {
    constructor(path, code, details) {
        super(`${path} ${Status_1.Status[code]}: ${details}`);
        this.path = path;
        this.code = code;
        this.details = details;
        this.name = 'ClientError';
        Object.defineProperty(this, '@@nice-grpc', {
            value: true,
        });
        Object.defineProperty(this, '@@nice-grpc:ClientError', {
            value: true,
        });
    }
    static [Symbol.hasInstance](instance) {
        // allow instances of ClientError from different versions of nice-grpc
        // to work with `instanceof ClientError`
        if (this !== ClientError) {
            return this.prototype.isPrototypeOf(instance);
        }
        return (typeof instance === 'object' &&
            instance !== null &&
            (instance.constructor === ClientError ||
                instance['@@nice-grpc:ClientError'] === true ||
                (instance.name === 'ClientError' && instance['@@nice-grpc'] === true)));
    }
}
exports.ClientError = ClientError;
//# sourceMappingURL=ClientError.js.map