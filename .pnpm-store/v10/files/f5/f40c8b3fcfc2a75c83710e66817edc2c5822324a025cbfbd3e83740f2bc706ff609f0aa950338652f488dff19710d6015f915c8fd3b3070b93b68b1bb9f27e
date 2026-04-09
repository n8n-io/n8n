"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceInUse = exports.ConflictException = exports.ResourceNotFound = exports.ResourceLimitExceeded = void 0;
const SageMakerServiceException_1 = require("./SageMakerServiceException");
class ResourceLimitExceeded extends SageMakerServiceException_1.SageMakerServiceException {
    name = "ResourceLimitExceeded";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceLimitExceeded",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceLimitExceeded.prototype);
        this.Message = opts.Message;
    }
}
exports.ResourceLimitExceeded = ResourceLimitExceeded;
class ResourceNotFound extends SageMakerServiceException_1.SageMakerServiceException {
    name = "ResourceNotFound";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceNotFound",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFound.prototype);
        this.Message = opts.Message;
    }
}
exports.ResourceNotFound = ResourceNotFound;
class ConflictException extends SageMakerServiceException_1.SageMakerServiceException {
    name = "ConflictException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
        this.Message = opts.Message;
    }
}
exports.ConflictException = ConflictException;
class ResourceInUse extends SageMakerServiceException_1.SageMakerServiceException {
    name = "ResourceInUse";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceInUse",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceInUse.prototype);
        this.Message = opts.Message;
    }
}
exports.ResourceInUse = ResourceInUse;
