/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { AuthError } from './AuthError.mjs';
import { invalidPlatformBrokerConfiguration, invalidRequestMethodForEAR, invalidAuthorizePostBodyParameters, authorityMismatch, cannotAllowPlatformBroker, cannotSetOIDCOptions, invalidAuthenticationHeader, missingNonceAuthenticationHeader, missingSshKid, missingSshJwk, untrustedAuthority, invalidAuthorityMetadata, invalidCloudDiscoveryMetadata, pkceParamsMissing, invalidCodeChallengeMethod, logoutRequestEmpty, tokenRequestEmpty, invalidClaims, emptyInputScopesError, urlEmptyError, urlParseError, authorityUriInsecure, claimsRequestParsingError, redirectUriEmpty } from './ClientConfigurationErrorCodes.mjs';
import * as ClientConfigurationErrorCodes from './ClientConfigurationErrorCodes.mjs';
export { ClientConfigurationErrorCodes };

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ClientConfigurationErrorMessages = {
    [redirectUriEmpty]: "A redirect URI is required for all calls, and none has been set.",
    [claimsRequestParsingError]: "Could not parse the given claims request object.",
    [authorityUriInsecure]: "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
    [urlParseError]: "URL could not be parsed into appropriate segments.",
    [urlEmptyError]: "URL was empty or null.",
    [emptyInputScopesError]: "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
    [invalidClaims]: "Given claims parameter must be a stringified JSON object.",
    [tokenRequestEmpty]: "Token request was empty and not found in cache.",
    [logoutRequestEmpty]: "The logout request was null or undefined.",
    [invalidCodeChallengeMethod]: 'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
    [pkceParamsMissing]: "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
    [invalidCloudDiscoveryMetadata]: "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
    [invalidAuthorityMetadata]: "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
    [untrustedAuthority]: "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
    [missingSshJwk]: "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
    [missingSshKid]: "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
    [missingNonceAuthenticationHeader]: "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
    [invalidAuthenticationHeader]: "Invalid authentication header provided",
    [cannotSetOIDCOptions]: "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
    [cannotAllowPlatformBroker]: "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
    [authorityMismatch]: "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
    [invalidAuthorizePostBodyParameters]: "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
    [invalidRequestMethodForEAR]: "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
    [invalidPlatformBrokerConfiguration]: "Invalid platform broker configuration. `allowPlatformBrokerWithDOM` can only be enabled when `allowPlatformBroker` is enabled.",
};
/**
 * ClientConfigurationErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use ClientConfigurationErrorCodes instead
 */
const ClientConfigurationErrorMessage = {
    redirectUriNotSet: {
        code: redirectUriEmpty,
        desc: ClientConfigurationErrorMessages[redirectUriEmpty],
    },
    claimsRequestParsingError: {
        code: claimsRequestParsingError,
        desc: ClientConfigurationErrorMessages[claimsRequestParsingError],
    },
    authorityUriInsecure: {
        code: authorityUriInsecure,
        desc: ClientConfigurationErrorMessages[authorityUriInsecure],
    },
    urlParseError: {
        code: urlParseError,
        desc: ClientConfigurationErrorMessages[urlParseError],
    },
    urlEmptyError: {
        code: urlEmptyError,
        desc: ClientConfigurationErrorMessages[urlEmptyError],
    },
    emptyScopesError: {
        code: emptyInputScopesError,
        desc: ClientConfigurationErrorMessages[emptyInputScopesError],
    },
    invalidClaimsRequest: {
        code: invalidClaims,
        desc: ClientConfigurationErrorMessages[invalidClaims],
    },
    tokenRequestEmptyError: {
        code: tokenRequestEmpty,
        desc: ClientConfigurationErrorMessages[tokenRequestEmpty],
    },
    logoutRequestEmptyError: {
        code: logoutRequestEmpty,
        desc: ClientConfigurationErrorMessages[logoutRequestEmpty],
    },
    invalidCodeChallengeMethod: {
        code: invalidCodeChallengeMethod,
        desc: ClientConfigurationErrorMessages[invalidCodeChallengeMethod],
    },
    invalidCodeChallengeParams: {
        code: pkceParamsMissing,
        desc: ClientConfigurationErrorMessages[pkceParamsMissing],
    },
    invalidCloudDiscoveryMetadata: {
        code: invalidCloudDiscoveryMetadata,
        desc: ClientConfigurationErrorMessages[invalidCloudDiscoveryMetadata],
    },
    invalidAuthorityMetadata: {
        code: invalidAuthorityMetadata,
        desc: ClientConfigurationErrorMessages[invalidAuthorityMetadata],
    },
    untrustedAuthority: {
        code: untrustedAuthority,
        desc: ClientConfigurationErrorMessages[untrustedAuthority],
    },
    missingSshJwk: {
        code: missingSshJwk,
        desc: ClientConfigurationErrorMessages[missingSshJwk],
    },
    missingSshKid: {
        code: missingSshKid,
        desc: ClientConfigurationErrorMessages[missingSshKid],
    },
    missingNonceAuthenticationHeader: {
        code: missingNonceAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[missingNonceAuthenticationHeader],
    },
    invalidAuthenticationHeader: {
        code: invalidAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[invalidAuthenticationHeader],
    },
    cannotSetOIDCOptions: {
        code: cannotSetOIDCOptions,
        desc: ClientConfigurationErrorMessages[cannotSetOIDCOptions],
    },
    cannotAllowPlatformBroker: {
        code: cannotAllowPlatformBroker,
        desc: ClientConfigurationErrorMessages[cannotAllowPlatformBroker],
    },
    authorityMismatch: {
        code: authorityMismatch,
        desc: ClientConfigurationErrorMessages[authorityMismatch],
    },
    invalidAuthorizePostBodyParameters: {
        code: invalidAuthorizePostBodyParameters,
        desc: ClientConfigurationErrorMessages[invalidAuthorizePostBodyParameters],
    },
    invalidRequestMethodForEAR: {
        code: invalidRequestMethodForEAR,
        desc: ClientConfigurationErrorMessages[invalidRequestMethodForEAR],
    },
    invalidPlatformBrokerConfiguration: {
        code: invalidPlatformBrokerConfiguration,
        desc: ClientConfigurationErrorMessages[invalidPlatformBrokerConfiguration],
    },
};
/**
 * Error thrown when there is an error in configuration of the MSAL.js library.
 */
class ClientConfigurationError extends AuthError {
    constructor(errorCode) {
        super(errorCode, ClientConfigurationErrorMessages[errorCode]);
        this.name = "ClientConfigurationError";
        Object.setPrototypeOf(this, ClientConfigurationError.prototype);
    }
}
function createClientConfigurationError(errorCode) {
    return new ClientConfigurationError(errorCode);
}

export { ClientConfigurationError, ClientConfigurationErrorMessage, ClientConfigurationErrorMessages, createClientConfigurationError };
//# sourceMappingURL=ClientConfigurationError.mjs.map
