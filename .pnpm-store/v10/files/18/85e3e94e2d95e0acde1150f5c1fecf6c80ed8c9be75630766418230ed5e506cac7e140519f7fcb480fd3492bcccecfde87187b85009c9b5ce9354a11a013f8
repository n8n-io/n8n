import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { SecretsManagerServiceException as __BaseException } from "./SecretsManagerServiceException";
export const FilterNameStringType = {
    all: "all",
    description: "description",
    name: "name",
    owning_service: "owning-service",
    primary_region: "primary-region",
    tag_key: "tag-key",
    tag_value: "tag-value",
};
export class DecryptionFailure extends __BaseException {
    name = "DecryptionFailure";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "DecryptionFailure",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DecryptionFailure.prototype);
        this.Message = opts.Message;
    }
}
export class InternalServiceError extends __BaseException {
    name = "InternalServiceError";
    $fault = "server";
    Message;
    constructor(opts) {
        super({
            name: "InternalServiceError",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServiceError.prototype);
        this.Message = opts.Message;
    }
}
export class InvalidNextTokenException extends __BaseException {
    name = "InvalidNextTokenException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "InvalidNextTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidNextTokenException.prototype);
        this.Message = opts.Message;
    }
}
export class InvalidParameterException extends __BaseException {
    name = "InvalidParameterException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "InvalidParameterException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidParameterException.prototype);
        this.Message = opts.Message;
    }
}
export class InvalidRequestException extends __BaseException {
    name = "InvalidRequestException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
        this.Message = opts.Message;
    }
}
export class ResourceNotFoundException extends __BaseException {
    name = "ResourceNotFoundException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
        this.Message = opts.Message;
    }
}
export const StatusType = {
    Failed: "Failed",
    InProgress: "InProgress",
    InSync: "InSync",
};
export class EncryptionFailure extends __BaseException {
    name = "EncryptionFailure";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "EncryptionFailure",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, EncryptionFailure.prototype);
        this.Message = opts.Message;
    }
}
export class LimitExceededException extends __BaseException {
    name = "LimitExceededException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
        this.Message = opts.Message;
    }
}
export class MalformedPolicyDocumentException extends __BaseException {
    name = "MalformedPolicyDocumentException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "MalformedPolicyDocumentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
        this.Message = opts.Message;
    }
}
export class PreconditionNotMetException extends __BaseException {
    name = "PreconditionNotMetException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "PreconditionNotMetException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, PreconditionNotMetException.prototype);
        this.Message = opts.Message;
    }
}
export class ResourceExistsException extends __BaseException {
    name = "ResourceExistsException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceExistsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceExistsException.prototype);
        this.Message = opts.Message;
    }
}
export const SortOrderType = {
    asc: "asc",
    desc: "desc",
};
export class PublicPolicyException extends __BaseException {
    name = "PublicPolicyException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "PublicPolicyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, PublicPolicyException.prototype);
        this.Message = opts.Message;
    }
}
export const SecretValueEntryFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretBinary && { SecretBinary: SENSITIVE_STRING }),
    ...(obj.SecretString && { SecretString: SENSITIVE_STRING }),
});
export const BatchGetSecretValueResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretValues && { SecretValues: obj.SecretValues.map((item) => SecretValueEntryFilterSensitiveLog(item)) }),
});
export const CreateSecretRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretBinary && { SecretBinary: SENSITIVE_STRING }),
    ...(obj.SecretString && { SecretString: SENSITIVE_STRING }),
});
export const GetRandomPasswordResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.RandomPassword && { RandomPassword: SENSITIVE_STRING }),
});
export const GetSecretValueResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretBinary && { SecretBinary: SENSITIVE_STRING }),
    ...(obj.SecretString && { SecretString: SENSITIVE_STRING }),
});
export const PutSecretValueRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretBinary && { SecretBinary: SENSITIVE_STRING }),
    ...(obj.SecretString && { SecretString: SENSITIVE_STRING }),
    ...(obj.RotationToken && { RotationToken: SENSITIVE_STRING }),
});
export const UpdateSecretRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretBinary && { SecretBinary: SENSITIVE_STRING }),
    ...(obj.SecretString && { SecretString: SENSITIVE_STRING }),
});
