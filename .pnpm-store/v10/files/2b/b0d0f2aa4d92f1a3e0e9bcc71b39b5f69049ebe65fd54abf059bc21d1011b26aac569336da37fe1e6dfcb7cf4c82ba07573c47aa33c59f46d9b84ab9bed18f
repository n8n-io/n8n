/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "./AuthError.js";
import * as ClientAuthErrorCodes from "./ClientAuthErrorCodes.js";
export { ClientAuthErrorCodes }; // Allow importing as "ClientAuthErrorCodes";

/**
 * ClientAuthErrorMessage class containing string constants used by error codes and messages.
 */

export const ClientAuthErrorMessages = {
    [ClientAuthErrorCodes.clientInfoDecodingError]:
        "The client info could not be parsed/decoded correctly",
    [ClientAuthErrorCodes.clientInfoEmptyError]: "The client info was empty",
    [ClientAuthErrorCodes.tokenParsingError]: "Token cannot be parsed",
    [ClientAuthErrorCodes.nullOrEmptyToken]: "The token is null or empty",
    [ClientAuthErrorCodes.endpointResolutionError]:
        "Endpoints cannot be resolved",
    [ClientAuthErrorCodes.networkError]: "Network request failed",
    [ClientAuthErrorCodes.openIdConfigError]:
        "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
    [ClientAuthErrorCodes.hashNotDeserialized]:
        "The hash parameters could not be deserialized",
    [ClientAuthErrorCodes.invalidState]: "State was not the expected format",
    [ClientAuthErrorCodes.stateMismatch]: "State mismatch error",
    [ClientAuthErrorCodes.stateNotFound]: "State not found",
    [ClientAuthErrorCodes.nonceMismatch]: "Nonce mismatch error",
    [ClientAuthErrorCodes.authTimeNotFound]:
        "Max Age was requested and the ID token is missing the auth_time variable." +
        " auth_time is an optional claim and is not enabled by default - it must be enabled." +
        " See https://aka.ms/msaljs/optional-claims for more information.",
    [ClientAuthErrorCodes.maxAgeTranspired]:
        "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
    [ClientAuthErrorCodes.multipleMatchingTokens]:
        "The cache contains multiple tokens satisfying the requirements. " +
        "Call AcquireToken again providing more requirements such as authority or account.",
    [ClientAuthErrorCodes.multipleMatchingAccounts]:
        "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
    [ClientAuthErrorCodes.multipleMatchingAppMetadata]:
        "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
    [ClientAuthErrorCodes.requestCannotBeMade]:
        "Token request cannot be made without authorization code or refresh token.",
    [ClientAuthErrorCodes.cannotRemoveEmptyScope]:
        "Cannot remove null or empty scope from ScopeSet",
    [ClientAuthErrorCodes.cannotAppendScopeSet]: "Cannot append ScopeSet",
    [ClientAuthErrorCodes.emptyInputScopeSet]:
        "Empty input ScopeSet cannot be processed",
    [ClientAuthErrorCodes.deviceCodePollingCancelled]:
        "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
    [ClientAuthErrorCodes.deviceCodeExpired]: "Device code is expired.",
    [ClientAuthErrorCodes.deviceCodeUnknownError]:
        "Device code stopped polling for unknown reasons.",
    [ClientAuthErrorCodes.noAccountInSilentRequest]:
        "Please pass an account object, silent flow is not supported without account information",
    [ClientAuthErrorCodes.invalidCacheRecord]:
        "Cache record object was null or undefined.",
    [ClientAuthErrorCodes.invalidCacheEnvironment]:
        "Invalid environment when attempting to create cache entry",
    [ClientAuthErrorCodes.noAccountFound]:
        "No account found in cache for given key.",
    [ClientAuthErrorCodes.noCryptoObject]: "No crypto object detected.",
    [ClientAuthErrorCodes.unexpectedCredentialType]:
        "Unexpected credential type.",
    [ClientAuthErrorCodes.invalidAssertion]:
        "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
    [ClientAuthErrorCodes.invalidClientCredential]:
        "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
    [ClientAuthErrorCodes.tokenRefreshRequired]:
        "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
    [ClientAuthErrorCodes.userTimeoutReached]:
        "User defined timeout for device code polling reached",
    [ClientAuthErrorCodes.tokenClaimsCnfRequiredForSignedJwt]:
        "Cannot generate a POP jwt if the token_claims are not populated",
    [ClientAuthErrorCodes.authorizationCodeMissingFromServerResponse]:
        "Server response does not contain an authorization code to proceed",
    [ClientAuthErrorCodes.bindingKeyNotRemoved]:
        "Could not remove the credential's binding key from storage.",
    [ClientAuthErrorCodes.endSessionEndpointNotSupported]:
        "The provided authority does not support logout",
    [ClientAuthErrorCodes.keyIdMissing]:
        "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
    [ClientAuthErrorCodes.noNetworkConnectivity]:
        "No network connectivity. Check your internet connection.",
    [ClientAuthErrorCodes.userCanceled]: "User cancelled the flow.",
    [ClientAuthErrorCodes.missingTenantIdError]:
        "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
    [ClientAuthErrorCodes.methodNotImplemented]:
        "This method has not been implemented",
    [ClientAuthErrorCodes.nestedAppAuthBridgeDisabled]:
        "The nested app auth bridge is disabled",
    [ClientAuthErrorCodes.platformBrokerError]:
        "An error occurred in the native broker. See the platformBrokerError property for details.",
};

/**
 * String constants used by error codes and messages.
 * @deprecated Use ClientAuthErrorCodes instead
 */
export const ClientAuthErrorMessage = {
    clientInfoDecodingError: {
        code: ClientAuthErrorCodes.clientInfoDecodingError,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.clientInfoDecodingError
        ],
    },
    clientInfoEmptyError: {
        code: ClientAuthErrorCodes.clientInfoEmptyError,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.clientInfoEmptyError
        ],
    },
    tokenParsingError: {
        code: ClientAuthErrorCodes.tokenParsingError,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.tokenParsingError],
    },
    nullOrEmptyToken: {
        code: ClientAuthErrorCodes.nullOrEmptyToken,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.nullOrEmptyToken],
    },
    endpointResolutionError: {
        code: ClientAuthErrorCodes.endpointResolutionError,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.endpointResolutionError
        ],
    },
    networkError: {
        code: ClientAuthErrorCodes.networkError,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.networkError],
    },
    unableToGetOpenidConfigError: {
        code: ClientAuthErrorCodes.openIdConfigError,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.openIdConfigError],
    },
    hashNotDeserialized: {
        code: ClientAuthErrorCodes.hashNotDeserialized,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.hashNotDeserialized],
    },
    invalidStateError: {
        code: ClientAuthErrorCodes.invalidState,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.invalidState],
    },
    stateMismatchError: {
        code: ClientAuthErrorCodes.stateMismatch,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.stateMismatch],
    },
    stateNotFoundError: {
        code: ClientAuthErrorCodes.stateNotFound,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.stateNotFound],
    },
    nonceMismatchError: {
        code: ClientAuthErrorCodes.nonceMismatch,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.nonceMismatch],
    },
    authTimeNotFoundError: {
        code: ClientAuthErrorCodes.authTimeNotFound,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.authTimeNotFound],
    },
    maxAgeTranspired: {
        code: ClientAuthErrorCodes.maxAgeTranspired,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.maxAgeTranspired],
    },
    multipleMatchingTokens: {
        code: ClientAuthErrorCodes.multipleMatchingTokens,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.multipleMatchingTokens
        ],
    },
    multipleMatchingAccounts: {
        code: ClientAuthErrorCodes.multipleMatchingAccounts,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.multipleMatchingAccounts
        ],
    },
    multipleMatchingAppMetadata: {
        code: ClientAuthErrorCodes.multipleMatchingAppMetadata,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.multipleMatchingAppMetadata
        ],
    },
    tokenRequestCannotBeMade: {
        code: ClientAuthErrorCodes.requestCannotBeMade,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.requestCannotBeMade],
    },
    removeEmptyScopeError: {
        code: ClientAuthErrorCodes.cannotRemoveEmptyScope,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.cannotRemoveEmptyScope
        ],
    },
    appendScopeSetError: {
        code: ClientAuthErrorCodes.cannotAppendScopeSet,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.cannotAppendScopeSet
        ],
    },
    emptyInputScopeSetError: {
        code: ClientAuthErrorCodes.emptyInputScopeSet,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.emptyInputScopeSet],
    },
    DeviceCodePollingCancelled: {
        code: ClientAuthErrorCodes.deviceCodePollingCancelled,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.deviceCodePollingCancelled
        ],
    },
    DeviceCodeExpired: {
        code: ClientAuthErrorCodes.deviceCodeExpired,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.deviceCodeExpired],
    },
    DeviceCodeUnknownError: {
        code: ClientAuthErrorCodes.deviceCodeUnknownError,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.deviceCodeUnknownError
        ],
    },
    NoAccountInSilentRequest: {
        code: ClientAuthErrorCodes.noAccountInSilentRequest,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.noAccountInSilentRequest
        ],
    },
    invalidCacheRecord: {
        code: ClientAuthErrorCodes.invalidCacheRecord,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.invalidCacheRecord],
    },
    invalidCacheEnvironment: {
        code: ClientAuthErrorCodes.invalidCacheEnvironment,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.invalidCacheEnvironment
        ],
    },
    noAccountFound: {
        code: ClientAuthErrorCodes.noAccountFound,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.noAccountFound],
    },
    noCryptoObj: {
        code: ClientAuthErrorCodes.noCryptoObject,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.noCryptoObject],
    },
    unexpectedCredentialType: {
        code: ClientAuthErrorCodes.unexpectedCredentialType,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.unexpectedCredentialType
        ],
    },
    invalidAssertion: {
        code: ClientAuthErrorCodes.invalidAssertion,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.invalidAssertion],
    },
    invalidClientCredential: {
        code: ClientAuthErrorCodes.invalidClientCredential,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.invalidClientCredential
        ],
    },
    tokenRefreshRequired: {
        code: ClientAuthErrorCodes.tokenRefreshRequired,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.tokenRefreshRequired
        ],
    },
    userTimeoutReached: {
        code: ClientAuthErrorCodes.userTimeoutReached,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.userTimeoutReached],
    },
    tokenClaimsRequired: {
        code: ClientAuthErrorCodes.tokenClaimsCnfRequiredForSignedJwt,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.tokenClaimsCnfRequiredForSignedJwt
        ],
    },
    noAuthorizationCodeFromServer: {
        code: ClientAuthErrorCodes.authorizationCodeMissingFromServerResponse,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.authorizationCodeMissingFromServerResponse
        ],
    },
    bindingKeyNotRemovedError: {
        code: ClientAuthErrorCodes.bindingKeyNotRemoved,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.bindingKeyNotRemoved
        ],
    },
    logoutNotSupported: {
        code: ClientAuthErrorCodes.endSessionEndpointNotSupported,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.endSessionEndpointNotSupported
        ],
    },
    keyIdMissing: {
        code: ClientAuthErrorCodes.keyIdMissing,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.keyIdMissing],
    },
    noNetworkConnectivity: {
        code: ClientAuthErrorCodes.noNetworkConnectivity,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.noNetworkConnectivity
        ],
    },
    userCanceledError: {
        code: ClientAuthErrorCodes.userCanceled,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.userCanceled],
    },
    missingTenantIdError: {
        code: ClientAuthErrorCodes.missingTenantIdError,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.missingTenantIdError
        ],
    },
    nestedAppAuthBridgeDisabled: {
        code: ClientAuthErrorCodes.nestedAppAuthBridgeDisabled,
        desc: ClientAuthErrorMessages[
            ClientAuthErrorCodes.nestedAppAuthBridgeDisabled
        ],
    },
    platformBrokerError: {
        code: ClientAuthErrorCodes.platformBrokerError,
        desc: ClientAuthErrorMessages[ClientAuthErrorCodes.platformBrokerError],
    },
};

/**
 * Error thrown when there is an error in the client code running on the browser.
 */
export class ClientAuthError extends AuthError {
    constructor(errorCode: string, additionalMessage?: string) {
        super(
            errorCode,
            additionalMessage
                ? `${ClientAuthErrorMessages[errorCode]}: ${additionalMessage}`
                : ClientAuthErrorMessages[errorCode]
        );
        this.name = "ClientAuthError";

        Object.setPrototypeOf(this, ClientAuthError.prototype);
    }
}

export function createClientAuthError(
    errorCode: string,
    additionalMessage?: string
): ClientAuthError {
    return new ClientAuthError(errorCode, additionalMessage);
}
