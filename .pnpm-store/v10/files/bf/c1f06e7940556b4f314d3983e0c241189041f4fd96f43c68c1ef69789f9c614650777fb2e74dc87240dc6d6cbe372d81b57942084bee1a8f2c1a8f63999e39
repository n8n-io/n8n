"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelStreamErrorException = exports.ModelTimeoutException = exports.ModelNotReadyException = exports.ModelErrorException = exports.ServiceUnavailableException = exports.ServiceQuotaExceededException = exports.ResourceNotFoundException = exports.ConflictException = exports.ValidationException = exports.ThrottlingException = exports.InternalServerException = exports.AccessDeniedException = void 0;
const BedrockRuntimeServiceException_1 = require("./BedrockRuntimeServiceException");
class AccessDeniedException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "AccessDeniedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
    }
}
exports.AccessDeniedException = AccessDeniedException;
class InternalServerException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "InternalServerException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
    }
}
exports.InternalServerException = InternalServerException;
class ThrottlingException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ThrottlingException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ThrottlingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ThrottlingException.prototype);
    }
}
exports.ThrottlingException = ThrottlingException;
class ValidationException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ValidationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
    }
}
exports.ValidationException = ValidationException;
class ConflictException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
    }
}
exports.ConflictException = ConflictException;
class ResourceNotFoundException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class ServiceQuotaExceededException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ServiceQuotaExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceQuotaExceededException.prototype);
    }
}
exports.ServiceQuotaExceededException = ServiceQuotaExceededException;
class ServiceUnavailableException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ServiceUnavailableException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ServiceUnavailableException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
    }
}
exports.ServiceUnavailableException = ServiceUnavailableException;
class ModelErrorException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelErrorException";
    $fault = "client";
    originalStatusCode;
    resourceName;
    constructor(opts) {
        super({
            name: "ModelErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.resourceName = opts.resourceName;
    }
}
exports.ModelErrorException = ModelErrorException;
class ModelNotReadyException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelNotReadyException";
    $fault = "client";
    $retryable = {};
    constructor(opts) {
        super({
            name: "ModelNotReadyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelNotReadyException.prototype);
    }
}
exports.ModelNotReadyException = ModelNotReadyException;
class ModelTimeoutException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelTimeoutException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ModelTimeoutException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelTimeoutException.prototype);
    }
}
exports.ModelTimeoutException = ModelTimeoutException;
class ModelStreamErrorException extends BedrockRuntimeServiceException_1.BedrockRuntimeServiceException {
    name = "ModelStreamErrorException";
    $fault = "client";
    originalStatusCode;
    originalMessage;
    constructor(opts) {
        super({
            name: "ModelStreamErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ModelStreamErrorException.prototype);
        this.originalStatusCode = opts.originalStatusCode;
        this.originalMessage = opts.originalMessage;
    }
}
exports.ModelStreamErrorException = ModelStreamErrorException;
