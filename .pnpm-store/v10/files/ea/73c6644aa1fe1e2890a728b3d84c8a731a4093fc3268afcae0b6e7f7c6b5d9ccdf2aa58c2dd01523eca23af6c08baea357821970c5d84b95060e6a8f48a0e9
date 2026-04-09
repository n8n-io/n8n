"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = exports.TooManyRequestsError = exports.InternalServerException = exports.AccessDeniedException = void 0;
const SigninServiceException_1 = require("./SigninServiceException");
class AccessDeniedException extends SigninServiceException_1.SigninServiceException {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.error = opts.error;
    }
}
exports.AccessDeniedException = AccessDeniedException;
class InternalServerException extends SigninServiceException_1.SigninServiceException {
    name = "InternalServerException";
    $fault = "server";
    error;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.error = opts.error;
    }
}
exports.InternalServerException = InternalServerException;
class TooManyRequestsError extends SigninServiceException_1.SigninServiceException {
    name = "TooManyRequestsError";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "TooManyRequestsError",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
        this.error = opts.error;
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class ValidationException extends SigninServiceException_1.SigninServiceException {
    name = "ValidationException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
        this.error = opts.error;
    }
}
exports.ValidationException = ValidationException;
