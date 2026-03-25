/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "@azure/msal-common/node";
import * as ManagedIdentityErrorCodes from "./ManagedIdentityErrorCodes.js";
import { ManagedIdentityEnvironmentVariableNames } from "../utils/Constants.js";
export { ManagedIdentityErrorCodes };

/**
 * ManagedIdentityErrorMessage class containing string constants used by error codes and messages.
 */
export const ManagedIdentityErrorMessages = {
    [ManagedIdentityErrorCodes.invalidFileExtension]:
        "The file path in the WWW-Authenticate header does not contain a .key file.",
    [ManagedIdentityErrorCodes.invalidFilePath]:
        "The file path in the WWW-Authenticate header is not in a valid Windows or Linux Format.",
    [ManagedIdentityErrorCodes.invalidManagedIdentityIdType]:
        "More than one ManagedIdentityIdType was provided.",
    [ManagedIdentityErrorCodes.invalidSecret]:
        "The secret in the file on the file path in the WWW-Authenticate header is greater than 4096 bytes.",
    [ManagedIdentityErrorCodes.platformNotSupported]:
        "The platform is not supported by Azure Arc. Azure Arc only supports Windows and Linux.",
    [ManagedIdentityErrorCodes.missingId]:
        "A ManagedIdentityId id was not provided.",
    [ManagedIdentityErrorCodes.MsiEnvironmentVariableUrlMalformedErrorCodes
        .AZURE_POD_IDENTITY_AUTHORITY_HOST]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST}' environment variable is malformed.`,
    [ManagedIdentityErrorCodes.MsiEnvironmentVariableUrlMalformedErrorCodes
        .IDENTITY_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variable is malformed.`,
    [ManagedIdentityErrorCodes.MsiEnvironmentVariableUrlMalformedErrorCodes
        .IMDS_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' environment variable is malformed.`,
    [ManagedIdentityErrorCodes.MsiEnvironmentVariableUrlMalformedErrorCodes
        .MSI_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' environment variable is malformed.`,
    [ManagedIdentityErrorCodes.networkUnavailable]:
        "Authentication unavailable. The request to the managed identity endpoint timed out.",
    [ManagedIdentityErrorCodes.unableToCreateAzureArc]:
        "Azure Arc Managed Identities can only be system assigned.",
    [ManagedIdentityErrorCodes.unableToCreateCloudShell]:
        "Cloud Shell Managed Identities can only be system assigned.",
    [ManagedIdentityErrorCodes.unableToCreateSource]:
        "Unable to create a Managed Identity source based on environment variables.",
    [ManagedIdentityErrorCodes.unableToReadSecretFile]:
        "Unable to read the secret file.",
    [ManagedIdentityErrorCodes.userAssignedNotAvailableAtRuntime]:
        "Service Fabric user assigned managed identity ClientId or ResourceId is not configurable at runtime.",
    [ManagedIdentityErrorCodes.wwwAuthenticateHeaderMissing]:
        "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is missing.",
    [ManagedIdentityErrorCodes.wwwAuthenticateHeaderUnsupportedFormat]:
        "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is in an unsupported format.",
};

export class ManagedIdentityError extends AuthError {
    constructor(errorCode: string) {
        super(errorCode, ManagedIdentityErrorMessages[errorCode]);
        this.name = "ManagedIdentityError";
        Object.setPrototypeOf(this, ManagedIdentityError.prototype);
    }
}

export function createManagedIdentityError(
    errorCode: string
): ManagedIdentityError {
    return new ManagedIdentityError(errorCode);
}
