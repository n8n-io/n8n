/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Extensibility interface, which allows the app developer to return a token, based on the passed-in parameters, instead of fetching tokens from
 * the Identity Provider (AAD).
 * Developers need to construct and return an AppTokenProviderResult object back to MSAL. MSAL will cache the token response
 * in the same way it would do if the result were comming from AAD.
 * This extensibility point is only defined for the client_credential flow, i.e. acquireTokenByClientCredential and
 * meant for Azure SDK to enhance Managed Identity support.
 */
export interface IAppTokenProvider {
    (
        appTokenProviderParameters: AppTokenProviderParameters
    ): Promise<AppTokenProviderResult>;
}

/**
 * Input object for the IAppTokenProvider extensiblity. MSAL will create this object, which can be used
 * to help create an AppTokenProviderResult.
 *
 * - correlationId           - the correlation Id associated with the request
 * - tenantId                - the tenant Id for which the token must be provided
 * - scopes                  - the scopes for which the token must be provided
 * - claims                  - any extra claims that the token must satisfy
 */
export type AppTokenProviderParameters = {
    readonly correlationId?: string;
    readonly tenantId: string;
    readonly scopes: Array<string>;
    readonly claims?: string;
};

/**
 * Output object for IAppTokenProvider extensiblity.
 *
 * - accessToken            - the actual access token, typically in JWT format, that satisfies the request data AppTokenProviderParameters
 * - expiresInSeconds       - how long the tokens has before expiry, in seconds. Similar to the "expires_in" field in an AAD token response.
 * - refreshInSeconds       - how long the token has before it should be proactively refreshed. Similar to the "refresh_in" field in an AAD token response.
 */
export type AppTokenProviderResult = {
    accessToken: string;
    expiresInSeconds: number;
    refreshInSeconds?: number;
};
