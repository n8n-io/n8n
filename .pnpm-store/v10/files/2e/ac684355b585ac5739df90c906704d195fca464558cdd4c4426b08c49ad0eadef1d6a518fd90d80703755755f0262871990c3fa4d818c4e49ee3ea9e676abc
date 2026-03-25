/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { AuthError } from '@azure/msal-common/node';
import { wwwAuthenticateHeaderUnsupportedFormat, wwwAuthenticateHeaderMissing, userAssignedNotAvailableAtRuntime, unableToReadSecretFile, unableToCreateSource, unableToCreateCloudShell, unableToCreateAzureArc, networkUnavailable, MsiEnvironmentVariableUrlMalformedErrorCodes, missingId, platformNotSupported, invalidSecret, invalidManagedIdentityIdType, invalidFilePath, invalidFileExtension } from './ManagedIdentityErrorCodes.mjs';
import { ManagedIdentityEnvironmentVariableNames } from '../utils/Constants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * ManagedIdentityErrorMessage class containing string constants used by error codes and messages.
 */
const ManagedIdentityErrorMessages = {
    [invalidFileExtension]: "The file path in the WWW-Authenticate header does not contain a .key file.",
    [invalidFilePath]: "The file path in the WWW-Authenticate header is not in a valid Windows or Linux Format.",
    [invalidManagedIdentityIdType]: "More than one ManagedIdentityIdType was provided.",
    [invalidSecret]: "The secret in the file on the file path in the WWW-Authenticate header is greater than 4096 bytes.",
    [platformNotSupported]: "The platform is not supported by Azure Arc. Azure Arc only supports Windows and Linux.",
    [missingId]: "A ManagedIdentityId id was not provided.",
    [MsiEnvironmentVariableUrlMalformedErrorCodes
        .AZURE_POD_IDENTITY_AUTHORITY_HOST]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes
        .IDENTITY_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes
        .IMDS_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes
        .MSI_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' environment variable is malformed.`,
    [networkUnavailable]: "Authentication unavailable. The request to the managed identity endpoint timed out.",
    [unableToCreateAzureArc]: "Azure Arc Managed Identities can only be system assigned.",
    [unableToCreateCloudShell]: "Cloud Shell Managed Identities can only be system assigned.",
    [unableToCreateSource]: "Unable to create a Managed Identity source based on environment variables.",
    [unableToReadSecretFile]: "Unable to read the secret file.",
    [userAssignedNotAvailableAtRuntime]: "Service Fabric user assigned managed identity ClientId or ResourceId is not configurable at runtime.",
    [wwwAuthenticateHeaderMissing]: "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is missing.",
    [wwwAuthenticateHeaderUnsupportedFormat]: "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is in an unsupported format.",
};
class ManagedIdentityError extends AuthError {
    constructor(errorCode) {
        super(errorCode, ManagedIdentityErrorMessages[errorCode]);
        this.name = "ManagedIdentityError";
        Object.setPrototypeOf(this, ManagedIdentityError.prototype);
    }
}
function createManagedIdentityError(errorCode) {
    return new ManagedIdentityError(errorCode);
}

export { ManagedIdentityError, ManagedIdentityErrorMessages, createManagedIdentityError };
//# sourceMappingURL=ManagedIdentityError.mjs.map
