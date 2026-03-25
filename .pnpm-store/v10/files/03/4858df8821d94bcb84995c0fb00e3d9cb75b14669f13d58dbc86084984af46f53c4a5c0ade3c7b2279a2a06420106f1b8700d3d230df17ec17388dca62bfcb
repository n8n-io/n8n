/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "./AuthError.js";
import * as ClientConfigurationErrorCodes from "./ClientConfigurationErrorCodes.js";
export { ClientConfigurationErrorCodes };

export const ClientConfigurationErrorMessages = {
    [ClientConfigurationErrorCodes.redirectUriEmpty]:
        "A redirect URI is required for all calls, and none has been set.",
    [ClientConfigurationErrorCodes.claimsRequestParsingError]:
        "Could not parse the given claims request object.",
    [ClientConfigurationErrorCodes.authorityUriInsecure]:
        "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
    [ClientConfigurationErrorCodes.urlParseError]:
        "URL could not be parsed into appropriate segments.",
    [ClientConfigurationErrorCodes.urlEmptyError]: "URL was empty or null.",
    [ClientConfigurationErrorCodes.emptyInputScopesError]:
        "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
    [ClientConfigurationErrorCodes.invalidClaims]:
        "Given claims parameter must be a stringified JSON object.",
    [ClientConfigurationErrorCodes.tokenRequestEmpty]:
        "Token request was empty and not found in cache.",
    [ClientConfigurationErrorCodes.logoutRequestEmpty]:
        "The logout request was null or undefined.",
    [ClientConfigurationErrorCodes.invalidCodeChallengeMethod]:
        'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
    [ClientConfigurationErrorCodes.pkceParamsMissing]:
        "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
    [ClientConfigurationErrorCodes.invalidCloudDiscoveryMetadata]:
        "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
    [ClientConfigurationErrorCodes.invalidAuthorityMetadata]:
        "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
    [ClientConfigurationErrorCodes.untrustedAuthority]:
        "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
    [ClientConfigurationErrorCodes.missingSshJwk]:
        "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
    [ClientConfigurationErrorCodes.missingSshKid]:
        "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
    [ClientConfigurationErrorCodes.missingNonceAuthenticationHeader]:
        "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
    [ClientConfigurationErrorCodes.invalidAuthenticationHeader]:
        "Invalid authentication header provided",
    [ClientConfigurationErrorCodes.cannotSetOIDCOptions]:
        "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
    [ClientConfigurationErrorCodes.cannotAllowPlatformBroker]:
        "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
    [ClientConfigurationErrorCodes.authorityMismatch]:
        "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
    [ClientConfigurationErrorCodes.invalidAuthorizePostBodyParameters]:
        "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
    [ClientConfigurationErrorCodes.invalidRequestMethodForEAR]:
        "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
    [ClientConfigurationErrorCodes.invalidPlatformBrokerConfiguration]:
        "Invalid platform broker configuration. `allowPlatformBrokerWithDOM` can only be enabled when `allowPlatformBroker` is enabled.",
};

/**
 * ClientConfigurationErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use ClientConfigurationErrorCodes instead
 */
export const ClientConfigurationErrorMessage = {
    redirectUriNotSet: {
        code: ClientConfigurationErrorCodes.redirectUriEmpty,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.redirectUriEmpty
        ],
    },
    claimsRequestParsingError: {
        code: ClientConfigurationErrorCodes.claimsRequestParsingError,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.claimsRequestParsingError
        ],
    },
    authorityUriInsecure: {
        code: ClientConfigurationErrorCodes.authorityUriInsecure,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.authorityUriInsecure
        ],
    },
    urlParseError: {
        code: ClientConfigurationErrorCodes.urlParseError,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.urlParseError
        ],
    },
    urlEmptyError: {
        code: ClientConfigurationErrorCodes.urlEmptyError,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.urlEmptyError
        ],
    },
    emptyScopesError: {
        code: ClientConfigurationErrorCodes.emptyInputScopesError,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.emptyInputScopesError
        ],
    },
    invalidClaimsRequest: {
        code: ClientConfigurationErrorCodes.invalidClaims,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidClaims
        ],
    },
    tokenRequestEmptyError: {
        code: ClientConfigurationErrorCodes.tokenRequestEmpty,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.tokenRequestEmpty
        ],
    },
    logoutRequestEmptyError: {
        code: ClientConfigurationErrorCodes.logoutRequestEmpty,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.logoutRequestEmpty
        ],
    },
    invalidCodeChallengeMethod: {
        code: ClientConfigurationErrorCodes.invalidCodeChallengeMethod,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidCodeChallengeMethod
        ],
    },
    invalidCodeChallengeParams: {
        code: ClientConfigurationErrorCodes.pkceParamsMissing,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.pkceParamsMissing
        ],
    },
    invalidCloudDiscoveryMetadata: {
        code: ClientConfigurationErrorCodes.invalidCloudDiscoveryMetadata,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidCloudDiscoveryMetadata
        ],
    },
    invalidAuthorityMetadata: {
        code: ClientConfigurationErrorCodes.invalidAuthorityMetadata,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidAuthorityMetadata
        ],
    },
    untrustedAuthority: {
        code: ClientConfigurationErrorCodes.untrustedAuthority,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.untrustedAuthority
        ],
    },
    missingSshJwk: {
        code: ClientConfigurationErrorCodes.missingSshJwk,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.missingSshJwk
        ],
    },
    missingSshKid: {
        code: ClientConfigurationErrorCodes.missingSshKid,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.missingSshKid
        ],
    },
    missingNonceAuthenticationHeader: {
        code: ClientConfigurationErrorCodes.missingNonceAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.missingNonceAuthenticationHeader
        ],
    },
    invalidAuthenticationHeader: {
        code: ClientConfigurationErrorCodes.invalidAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidAuthenticationHeader
        ],
    },
    cannotSetOIDCOptions: {
        code: ClientConfigurationErrorCodes.cannotSetOIDCOptions,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.cannotSetOIDCOptions
        ],
    },
    cannotAllowPlatformBroker: {
        code: ClientConfigurationErrorCodes.cannotAllowPlatformBroker,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.cannotAllowPlatformBroker
        ],
    },
    authorityMismatch: {
        code: ClientConfigurationErrorCodes.authorityMismatch,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.authorityMismatch
        ],
    },
    invalidAuthorizePostBodyParameters: {
        code: ClientConfigurationErrorCodes.invalidAuthorizePostBodyParameters,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidAuthorizePostBodyParameters
        ],
    },
    invalidRequestMethodForEAR: {
        code: ClientConfigurationErrorCodes.invalidRequestMethodForEAR,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidRequestMethodForEAR
        ],
    },
    invalidPlatformBrokerConfiguration: {
        code: ClientConfigurationErrorCodes.invalidPlatformBrokerConfiguration,
        desc: ClientConfigurationErrorMessages[
            ClientConfigurationErrorCodes.invalidPlatformBrokerConfiguration
        ],
    },
};

/**
 * Error thrown when there is an error in configuration of the MSAL.js library.
 */
export class ClientConfigurationError extends AuthError {
    constructor(errorCode: string) {
        super(errorCode, ClientConfigurationErrorMessages[errorCode]);
        this.name = "ClientConfigurationError";
        Object.setPrototypeOf(this, ClientConfigurationError.prototype);
    }
}

export function createClientConfigurationError(
    errorCode: string
): ClientConfigurationError {
    return new ClientConfigurationError(errorCode);
}
