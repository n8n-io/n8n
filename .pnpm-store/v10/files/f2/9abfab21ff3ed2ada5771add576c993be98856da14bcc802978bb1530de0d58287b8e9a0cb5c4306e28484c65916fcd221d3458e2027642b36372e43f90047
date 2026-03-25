import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { CognitoIdentityServiceException as __BaseException } from "./CognitoIdentityServiceException";
export const AmbiguousRoleResolutionType = {
    AUTHENTICATED_ROLE: "AuthenticatedRole",
    DENY: "Deny",
};
export class InternalErrorException extends __BaseException {
    name = "InternalErrorException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalErrorException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalErrorException.prototype);
    }
}
export class InvalidParameterException extends __BaseException {
    name = "InvalidParameterException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidParameterException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidParameterException.prototype);
    }
}
export class LimitExceededException extends __BaseException {
    name = "LimitExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
    }
}
export class NotAuthorizedException extends __BaseException {
    name = "NotAuthorizedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "NotAuthorizedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, NotAuthorizedException.prototype);
    }
}
export class ResourceConflictException extends __BaseException {
    name = "ResourceConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceConflictException.prototype);
    }
}
export class TooManyRequestsException extends __BaseException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
export const ErrorCode = {
    ACCESS_DENIED: "AccessDenied",
    INTERNAL_SERVER_ERROR: "InternalServerError",
};
export class ResourceNotFoundException extends __BaseException {
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
export class ExternalServiceException extends __BaseException {
    name = "ExternalServiceException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ExternalServiceException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ExternalServiceException.prototype);
    }
}
export class InvalidIdentityPoolConfigurationException extends __BaseException {
    name = "InvalidIdentityPoolConfigurationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidIdentityPoolConfigurationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidIdentityPoolConfigurationException.prototype);
    }
}
export const MappingRuleMatchType = {
    CONTAINS: "Contains",
    EQUALS: "Equals",
    NOT_EQUAL: "NotEqual",
    STARTS_WITH: "StartsWith",
};
export const RoleMappingType = {
    RULES: "Rules",
    TOKEN: "Token",
};
export class DeveloperUserAlreadyRegisteredException extends __BaseException {
    name = "DeveloperUserAlreadyRegisteredException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "DeveloperUserAlreadyRegisteredException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DeveloperUserAlreadyRegisteredException.prototype);
    }
}
export class ConcurrentModificationException extends __BaseException {
    name = "ConcurrentModificationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConcurrentModificationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConcurrentModificationException.prototype);
    }
}
export const GetCredentialsForIdentityInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Logins && { Logins: SENSITIVE_STRING }),
});
export const CredentialsFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SecretKey && { SecretKey: SENSITIVE_STRING }),
});
export const GetCredentialsForIdentityResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Credentials && { Credentials: CredentialsFilterSensitiveLog(obj.Credentials) }),
});
export const GetIdInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Logins && { Logins: SENSITIVE_STRING }),
});
export const GetOpenIdTokenInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Logins && { Logins: SENSITIVE_STRING }),
});
export const GetOpenIdTokenResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Token && { Token: SENSITIVE_STRING }),
});
export const GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Logins && { Logins: SENSITIVE_STRING }),
});
export const GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Token && { Token: SENSITIVE_STRING }),
});
export const UnlinkIdentityInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Logins && { Logins: SENSITIVE_STRING }),
});
