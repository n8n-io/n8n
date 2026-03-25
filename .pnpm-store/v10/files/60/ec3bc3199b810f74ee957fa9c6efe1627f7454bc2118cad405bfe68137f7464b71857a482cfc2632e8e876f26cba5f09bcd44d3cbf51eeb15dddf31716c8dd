/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ManagedIdentityEnvironmentVariableNames } from "../utils/Constants.js";

export const invalidFileExtension = "invalid_file_extension";
export const invalidFilePath = "invalid_file_path";
export const invalidManagedIdentityIdType = "invalid_managed_identity_id_type";
export const invalidSecret = "invalid_secret";
export const missingId = "missing_client_id";
export const networkUnavailable = "network_unavailable";
export const platformNotSupported = "platform_not_supported";
export const unableToCreateAzureArc = "unable_to_create_azure_arc";
export const unableToCreateCloudShell = "unable_to_create_cloud_shell";
export const unableToCreateSource = "unable_to_create_source";
export const unableToReadSecretFile = "unable_to_read_secret_file";
export const urlParseError = "url_parse_error";
export const userAssignedNotAvailableAtRuntime =
    "user_assigned_not_available_at_runtime";
export const wwwAuthenticateHeaderMissing = "www_authenticate_header_missing";
export const wwwAuthenticateHeaderUnsupportedFormat =
    "www_authenticate_header_unsupported_format";

export const MsiEnvironmentVariableUrlMalformedErrorCodes = {
    [ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]:
        "azure_pod_identity_authority_host_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT]:
        "identity_endpoint_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT]:
        "imds_endpoint_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT]:
        "msi_endpoint_url_malformed",
} as const;
export type MsiEnvironmentVariableErrorCodes =
    (typeof MsiEnvironmentVariableUrlMalformedErrorCodes)[keyof typeof MsiEnvironmentVariableUrlMalformedErrorCodes];
