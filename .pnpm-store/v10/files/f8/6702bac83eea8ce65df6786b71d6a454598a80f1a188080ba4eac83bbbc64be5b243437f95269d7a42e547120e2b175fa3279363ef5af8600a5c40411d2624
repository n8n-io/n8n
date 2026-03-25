/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { AuthError } from './AuthError.mjs';
import { platformBrokerError, nestedAppAuthBridgeDisabled, missingTenantIdError, userCanceled, noNetworkConnectivity, keyIdMissing, endSessionEndpointNotSupported, bindingKeyNotRemoved, authorizationCodeMissingFromServerResponse, tokenClaimsCnfRequiredForSignedJwt, userTimeoutReached, tokenRefreshRequired, invalidClientCredential, invalidAssertion, unexpectedCredentialType, noCryptoObject, noAccountFound, invalidCacheEnvironment, invalidCacheRecord, noAccountInSilentRequest, deviceCodeUnknownError, deviceCodeExpired, deviceCodePollingCancelled, emptyInputScopeSet, cannotAppendScopeSet, cannotRemoveEmptyScope, requestCannotBeMade, multipleMatchingAppMetadata, multipleMatchingAccounts, multipleMatchingTokens, maxAgeTranspired, authTimeNotFound, nonceMismatch, stateNotFound, stateMismatch, invalidState, hashNotDeserialized, openIdConfigError, networkError, endpointResolutionError, nullOrEmptyToken, tokenParsingError, clientInfoEmptyError, clientInfoDecodingError, methodNotImplemented } from './ClientAuthErrorCodes.mjs';
import * as ClientAuthErrorCodes from './ClientAuthErrorCodes.mjs';
export { ClientAuthErrorCodes };

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * ClientAuthErrorMessage class containing string constants used by error codes and messages.
 */
const ClientAuthErrorMessages = {
    [clientInfoDecodingError]: "The client info could not be parsed/decoded correctly",
    [clientInfoEmptyError]: "The client info was empty",
    [tokenParsingError]: "Token cannot be parsed",
    [nullOrEmptyToken]: "The token is null or empty",
    [endpointResolutionError]: "Endpoints cannot be resolved",
    [networkError]: "Network request failed",
    [openIdConfigError]: "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
    [hashNotDeserialized]: "The hash parameters could not be deserialized",
    [invalidState]: "State was not the expected format",
    [stateMismatch]: "State mismatch error",
    [stateNotFound]: "State not found",
    [nonceMismatch]: "Nonce mismatch error",
    [authTimeNotFound]: "Max Age was requested and the ID token is missing the auth_time variable." +
        " auth_time is an optional claim and is not enabled by default - it must be enabled." +
        " See https://aka.ms/msaljs/optional-claims for more information.",
    [maxAgeTranspired]: "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
    [multipleMatchingTokens]: "The cache contains multiple tokens satisfying the requirements. " +
        "Call AcquireToken again providing more requirements such as authority or account.",
    [multipleMatchingAccounts]: "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
    [multipleMatchingAppMetadata]: "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
    [requestCannotBeMade]: "Token request cannot be made without authorization code or refresh token.",
    [cannotRemoveEmptyScope]: "Cannot remove null or empty scope from ScopeSet",
    [cannotAppendScopeSet]: "Cannot append ScopeSet",
    [emptyInputScopeSet]: "Empty input ScopeSet cannot be processed",
    [deviceCodePollingCancelled]: "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
    [deviceCodeExpired]: "Device code is expired.",
    [deviceCodeUnknownError]: "Device code stopped polling for unknown reasons.",
    [noAccountInSilentRequest]: "Please pass an account object, silent flow is not supported without account information",
    [invalidCacheRecord]: "Cache record object was null or undefined.",
    [invalidCacheEnvironment]: "Invalid environment when attempting to create cache entry",
    [noAccountFound]: "No account found in cache for given key.",
    [noCryptoObject]: "No crypto object detected.",
    [unexpectedCredentialType]: "Unexpected credential type.",
    [invalidAssertion]: "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
    [invalidClientCredential]: "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
    [tokenRefreshRequired]: "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
    [userTimeoutReached]: "User defined timeout for device code polling reached",
    [tokenClaimsCnfRequiredForSignedJwt]: "Cannot generate a POP jwt if the token_claims are not populated",
    [authorizationCodeMissingFromServerResponse]: "Server response does not contain an authorization code to proceed",
    [bindingKeyNotRemoved]: "Could not remove the credential's binding key from storage.",
    [endSessionEndpointNotSupported]: "The provided authority does not support logout",
    [keyIdMissing]: "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
    [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
    [userCanceled]: "User cancelled the flow.",
    [missingTenantIdError]: "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
    [methodNotImplemented]: "This method has not been implemented",
    [nestedAppAuthBridgeDisabled]: "The nested app auth bridge is disabled",
    [platformBrokerError]: "An error occurred in the native broker. See the platformBrokerError property for details.",
};
/**
 * String constants used by error codes and messages.
 * @deprecated Use ClientAuthErrorCodes instead
 */
const ClientAuthErrorMessage = {
    clientInfoDecodingError: {
        code: clientInfoDecodingError,
        desc: ClientAuthErrorMessages[clientInfoDecodingError],
    },
    clientInfoEmptyError: {
        code: clientInfoEmptyError,
        desc: ClientAuthErrorMessages[clientInfoEmptyError],
    },
    tokenParsingError: {
        code: tokenParsingError,
        desc: ClientAuthErrorMessages[tokenParsingError],
    },
    nullOrEmptyToken: {
        code: nullOrEmptyToken,
        desc: ClientAuthErrorMessages[nullOrEmptyToken],
    },
    endpointResolutionError: {
        code: endpointResolutionError,
        desc: ClientAuthErrorMessages[endpointResolutionError],
    },
    networkError: {
        code: networkError,
        desc: ClientAuthErrorMessages[networkError],
    },
    unableToGetOpenidConfigError: {
        code: openIdConfigError,
        desc: ClientAuthErrorMessages[openIdConfigError],
    },
    hashNotDeserialized: {
        code: hashNotDeserialized,
        desc: ClientAuthErrorMessages[hashNotDeserialized],
    },
    invalidStateError: {
        code: invalidState,
        desc: ClientAuthErrorMessages[invalidState],
    },
    stateMismatchError: {
        code: stateMismatch,
        desc: ClientAuthErrorMessages[stateMismatch],
    },
    stateNotFoundError: {
        code: stateNotFound,
        desc: ClientAuthErrorMessages[stateNotFound],
    },
    nonceMismatchError: {
        code: nonceMismatch,
        desc: ClientAuthErrorMessages[nonceMismatch],
    },
    authTimeNotFoundError: {
        code: authTimeNotFound,
        desc: ClientAuthErrorMessages[authTimeNotFound],
    },
    maxAgeTranspired: {
        code: maxAgeTranspired,
        desc: ClientAuthErrorMessages[maxAgeTranspired],
    },
    multipleMatchingTokens: {
        code: multipleMatchingTokens,
        desc: ClientAuthErrorMessages[multipleMatchingTokens],
    },
    multipleMatchingAccounts: {
        code: multipleMatchingAccounts,
        desc: ClientAuthErrorMessages[multipleMatchingAccounts],
    },
    multipleMatchingAppMetadata: {
        code: multipleMatchingAppMetadata,
        desc: ClientAuthErrorMessages[multipleMatchingAppMetadata],
    },
    tokenRequestCannotBeMade: {
        code: requestCannotBeMade,
        desc: ClientAuthErrorMessages[requestCannotBeMade],
    },
    removeEmptyScopeError: {
        code: cannotRemoveEmptyScope,
        desc: ClientAuthErrorMessages[cannotRemoveEmptyScope],
    },
    appendScopeSetError: {
        code: cannotAppendScopeSet,
        desc: ClientAuthErrorMessages[cannotAppendScopeSet],
    },
    emptyInputScopeSetError: {
        code: emptyInputScopeSet,
        desc: ClientAuthErrorMessages[emptyInputScopeSet],
    },
    DeviceCodePollingCancelled: {
        code: deviceCodePollingCancelled,
        desc: ClientAuthErrorMessages[deviceCodePollingCancelled],
    },
    DeviceCodeExpired: {
        code: deviceCodeExpired,
        desc: ClientAuthErrorMessages[deviceCodeExpired],
    },
    DeviceCodeUnknownError: {
        code: deviceCodeUnknownError,
        desc: ClientAuthErrorMessages[deviceCodeUnknownError],
    },
    NoAccountInSilentRequest: {
        code: noAccountInSilentRequest,
        desc: ClientAuthErrorMessages[noAccountInSilentRequest],
    },
    invalidCacheRecord: {
        code: invalidCacheRecord,
        desc: ClientAuthErrorMessages[invalidCacheRecord],
    },
    invalidCacheEnvironment: {
        code: invalidCacheEnvironment,
        desc: ClientAuthErrorMessages[invalidCacheEnvironment],
    },
    noAccountFound: {
        code: noAccountFound,
        desc: ClientAuthErrorMessages[noAccountFound],
    },
    noCryptoObj: {
        code: noCryptoObject,
        desc: ClientAuthErrorMessages[noCryptoObject],
    },
    unexpectedCredentialType: {
        code: unexpectedCredentialType,
        desc: ClientAuthErrorMessages[unexpectedCredentialType],
    },
    invalidAssertion: {
        code: invalidAssertion,
        desc: ClientAuthErrorMessages[invalidAssertion],
    },
    invalidClientCredential: {
        code: invalidClientCredential,
        desc: ClientAuthErrorMessages[invalidClientCredential],
    },
    tokenRefreshRequired: {
        code: tokenRefreshRequired,
        desc: ClientAuthErrorMessages[tokenRefreshRequired],
    },
    userTimeoutReached: {
        code: userTimeoutReached,
        desc: ClientAuthErrorMessages[userTimeoutReached],
    },
    tokenClaimsRequired: {
        code: tokenClaimsCnfRequiredForSignedJwt,
        desc: ClientAuthErrorMessages[tokenClaimsCnfRequiredForSignedJwt],
    },
    noAuthorizationCodeFromServer: {
        code: authorizationCodeMissingFromServerResponse,
        desc: ClientAuthErrorMessages[authorizationCodeMissingFromServerResponse],
    },
    bindingKeyNotRemovedError: {
        code: bindingKeyNotRemoved,
        desc: ClientAuthErrorMessages[bindingKeyNotRemoved],
    },
    logoutNotSupported: {
        code: endSessionEndpointNotSupported,
        desc: ClientAuthErrorMessages[endSessionEndpointNotSupported],
    },
    keyIdMissing: {
        code: keyIdMissing,
        desc: ClientAuthErrorMessages[keyIdMissing],
    },
    noNetworkConnectivity: {
        code: noNetworkConnectivity,
        desc: ClientAuthErrorMessages[noNetworkConnectivity],
    },
    userCanceledError: {
        code: userCanceled,
        desc: ClientAuthErrorMessages[userCanceled],
    },
    missingTenantIdError: {
        code: missingTenantIdError,
        desc: ClientAuthErrorMessages[missingTenantIdError],
    },
    nestedAppAuthBridgeDisabled: {
        code: nestedAppAuthBridgeDisabled,
        desc: ClientAuthErrorMessages[nestedAppAuthBridgeDisabled],
    },
    platformBrokerError: {
        code: platformBrokerError,
        desc: ClientAuthErrorMessages[platformBrokerError],
    },
};
/**
 * Error thrown when there is an error in the client code running on the browser.
 */
class ClientAuthError extends AuthError {
    constructor(errorCode, additionalMessage) {
        super(errorCode, additionalMessage
            ? `${ClientAuthErrorMessages[errorCode]}: ${additionalMessage}`
            : ClientAuthErrorMessages[errorCode]);
        this.name = "ClientAuthError";
        Object.setPrototypeOf(this, ClientAuthError.prototype);
    }
}
function createClientAuthError(errorCode, additionalMessage) {
    return new ClientAuthError(errorCode, additionalMessage);
}

export { ClientAuthError, ClientAuthErrorMessage, ClientAuthErrorMessages, createClientAuthError };
//# sourceMappingURL=ClientAuthError.mjs.map
