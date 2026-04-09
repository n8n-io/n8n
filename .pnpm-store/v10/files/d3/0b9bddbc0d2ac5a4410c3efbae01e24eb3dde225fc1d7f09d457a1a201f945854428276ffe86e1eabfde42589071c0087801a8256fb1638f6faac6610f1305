"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelNotReadyException = exports.ServiceQuotaExceededException = exports.DependencyFailedException = exports.ConflictException = exports.BadGatewayException = exports.ValidationException = exports.ThrottlingException = exports.ResourceNotFoundException = exports.InternalServerException = exports.AccessDeniedException = void 0;
const BedrockAgentRuntimeServiceException_1 = require("./BedrockAgentRuntimeServiceException");
class AccessDeniedException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class InternalServerException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
    name = "InternalServerException";
    $fault = "server";
    reason;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.reason = opts.reason;
    }
}
exports.InternalServerException = InternalServerException;
class ResourceNotFoundException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class ThrottlingException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class ValidationException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class BadGatewayException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
    name = "BadGatewayException";
    $fault = "server";
    resourceName;
    constructor(opts) {
        super({
            name: "BadGatewayException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, BadGatewayException.prototype);
        this.resourceName = opts.resourceName;
    }
}
exports.BadGatewayException = BadGatewayException;
class ConflictException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class DependencyFailedException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
    name = "DependencyFailedException";
    $fault = "client";
    resourceName;
    constructor(opts) {
        super({
            name: "DependencyFailedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DependencyFailedException.prototype);
        this.resourceName = opts.resourceName;
    }
}
exports.DependencyFailedException = DependencyFailedException;
class ServiceQuotaExceededException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
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
class ModelNotReadyException extends BedrockAgentRuntimeServiceException_1.BedrockAgentRuntimeServiceException {
    name = "ModelNotReadyException";
    $fault = "client";
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
