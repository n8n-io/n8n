/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Tenant Discovery Response which contains the relevant OAuth endpoints and data needed for authentication and authorization.
 */
export type OpenIdConfigResponse = {
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint?: string;
    issuer: string;
    jwks_uri: string;
};

export function isOpenIdConfigResponse(response: object): boolean {
    return (
        response.hasOwnProperty("authorization_endpoint") &&
        response.hasOwnProperty("token_endpoint") &&
        response.hasOwnProperty("issuer") &&
        response.hasOwnProperty("jwks_uri")
    );
}
