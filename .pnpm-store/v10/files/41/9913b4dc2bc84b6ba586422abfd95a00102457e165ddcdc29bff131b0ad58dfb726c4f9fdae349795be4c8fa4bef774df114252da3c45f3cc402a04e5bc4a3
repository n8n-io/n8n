/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * The OpenID Configuration Endpoint Response type. Used by the authority class to get relevant OAuth endpoints.
 */
export type CloudInstanceDiscoveryErrorResponse = {
    error: String;
    error_description: String;
    error_codes?: Array<Number>;
    timestamp?: String;
    trace_id?: String;
    correlation_id?: String;
    error_uri?: String;
};

export function isCloudInstanceDiscoveryErrorResponse(
    response: object
): boolean {
    return (
        response.hasOwnProperty("error") &&
        response.hasOwnProperty("error_description")
    );
}
