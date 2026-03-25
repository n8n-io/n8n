"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerError = void 0;
const ts_error_1 = require("ts-error");
const Status_1 = require("../Status");
/**
 * Service implementations may throw this error to report gRPC errors to
 * clients.
 */
class ServerError extends ts_error_1.ExtendableError {
    constructor(code, details) {
        super(`${Status_1.Status[code]}: ${details}`);
        this.code = code;
        this.details = details;
        this.name = 'ServerError';
        Object.defineProperty(this, '@@nice-grpc', {
            value: true,
        });
        Object.defineProperty(this, '@@nice-grpc:ServerError', {
            value: true,
        });
    }
    static [Symbol.hasInstance](instance) {
        // allow instances of ServerError from different versions of nice-grpc
        // to work with `instanceof ServerError`
        if (this !== ServerError) {
            return this.prototype.isPrototypeOf(instance);
        }
        return (typeof instance === 'object' &&
            instance !== null &&
            (instance.constructor === ServerError ||
                instance['@@nice-grpc:ServerError'] === true ||
                (instance.name === 'ServerError' && instance['@@nice-grpc'] === true)));
    }
}
exports.ServerError = ServerError;
//# sourceMappingURL=ServerError.js.map