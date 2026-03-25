import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
export class AccessDeniedException extends __BaseException {
    name = "AccessDeniedException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class AuthorizationPendingException extends __BaseException {
    name = "AuthorizationPendingException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "AuthorizationPendingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class ExpiredTokenException extends __BaseException {
    name = "ExpiredTokenException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "ExpiredTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ExpiredTokenException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InternalServerException extends __BaseException {
    name = "InternalServerException";
    $fault = "server";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidClientException extends __BaseException {
    name = "InvalidClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidClientException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidGrantException extends __BaseException {
    name = "InvalidGrantException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidGrantException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidGrantException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidRequestException extends __BaseException {
    name = "InvalidRequestException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidScopeException extends __BaseException {
    name = "InvalidScopeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidScopeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidScopeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class SlowDownException extends __BaseException {
    name = "SlowDownException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "SlowDownException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, SlowDownException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class UnauthorizedClientException extends __BaseException {
    name = "UnauthorizedClientException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "UnauthorizedClientException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class UnsupportedGrantTypeException extends __BaseException {
    name = "UnsupportedGrantTypeException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "UnsupportedGrantTypeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidRequestRegionException extends __BaseException {
    name = "InvalidRequestRegionException";
    $fault = "client";
    error;
    error_description;
    endpoint;
    region;
    constructor(opts) {
        super({
            name: "InvalidRequestRegionException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestRegionException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
        this.endpoint = opts.endpoint;
        this.region = opts.region;
    }
}
export class InvalidClientMetadataException extends __BaseException {
    name = "InvalidClientMetadataException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidClientMetadataException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidClientMetadataException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export class InvalidRedirectUriException extends __BaseException {
    name = "InvalidRedirectUriException";
    $fault = "client";
    error;
    error_description;
    constructor(opts) {
        super({
            name: "InvalidRedirectUriException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRedirectUriException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
    }
}
export const CreateTokenRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.clientSecret && { clientSecret: SENSITIVE_STRING }),
    ...(obj.refreshToken && { refreshToken: SENSITIVE_STRING }),
    ...(obj.codeVerifier && { codeVerifier: SENSITIVE_STRING }),
});
export const CreateTokenResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: SENSITIVE_STRING }),
    ...(obj.refreshToken && { refreshToken: SENSITIVE_STRING }),
    ...(obj.idToken && { idToken: SENSITIVE_STRING }),
});
export const CreateTokenWithIAMRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.refreshToken && { refreshToken: SENSITIVE_STRING }),
    ...(obj.assertion && { assertion: SENSITIVE_STRING }),
    ...(obj.subjectToken && { subjectToken: SENSITIVE_STRING }),
    ...(obj.codeVerifier && { codeVerifier: SENSITIVE_STRING }),
});
export const CreateTokenWithIAMResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.accessToken && { accessToken: SENSITIVE_STRING }),
    ...(obj.refreshToken && { refreshToken: SENSITIVE_STRING }),
    ...(obj.idToken && { idToken: SENSITIVE_STRING }),
});
export const RegisterClientResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.clientSecret && { clientSecret: SENSITIVE_STRING }),
});
export const StartDeviceAuthorizationRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.clientSecret && { clientSecret: SENSITIVE_STRING }),
});
