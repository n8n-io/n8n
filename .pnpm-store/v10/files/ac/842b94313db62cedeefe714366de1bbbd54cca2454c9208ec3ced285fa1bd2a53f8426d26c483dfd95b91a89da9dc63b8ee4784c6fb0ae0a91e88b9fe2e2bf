/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AuthConfiguration } from './authConfiguration';
import { AuthProvider } from './authProvider';
/**
 * Provides tokens using MSAL.
 */
export declare class MsalTokenProvider implements AuthProvider {
    private readonly _agenticTokenCache;
    readonly connectionSettings?: AuthConfiguration;
    constructor(connectionSettings?: AuthConfiguration);
    /**
     * Gets an access token using the auth configuration from the MsalTokenProvider instance and the provided scope.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    getAccessToken(scope: string): Promise<string>;
    /**
     * Gets an access token.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    getAccessToken(authConfig: AuthConfiguration, scope: string): Promise<string>;
    acquireTokenOnBehalfOf(scopes: string[], oboAssertion: string): Promise<string>;
    acquireTokenOnBehalfOf(authConfig: AuthConfiguration, scopes: string[], oboAssertion: string): Promise<string>;
    getAgenticInstanceToken(tenantId: string, agentAppInstanceId: string): Promise<string>;
    /**
     * This method can optionally accept a tenant ID that overrides the tenant ID in the connection settings, if the connection settings authority contains "common".
     * @param tenantId
     * @returns
     */
    private resolveAuthority;
    /**
     * Does a direct HTTP call to acquire a token for agentic scenarios - do not use this directly!
     * This method will be removed once MSAL is updated with the necessary features.
     * (This is required in order to pass additional parameters into the auth call)
     * @param tenantId
     * @param clientId
     * @param clientAssertion
     * @param scopes
     * @param tokenBodyParameters
     * @returns
     */
    private acquireTokenForAgenticScenarios;
    getAgenticUserToken(tenantId: string, agentAppInstanceId: string, agenticUserId: string, scopes: string[]): Promise<string>;
    getAgenticApplicationToken(tenantId: string, agentAppInstanceId: string): Promise<string>;
    private readonly sysOptions;
    /**
     * Generates the client assertion using the provided certificate.
     * @param authConfig The authentication configuration.
     * @returns The client assertion.
     */
    private getAssertionFromCert;
    /**
     * Acquires a token using a user-assigned identity.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    private acquireTokenWithUserAssignedIdentity;
    /**
     * Acquires a token using a certificate.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    private acquireTokenWithCertificate;
    /**
     * Acquires a token using a client secret.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    private acquireAccessTokenViaSecret;
    /**
     * Acquires a token using a FIC client assertion.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    private acquireAccessTokenViaFIC;
    /**
     * Acquires a token using a Workload Identity client assertion.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    private acquireAccessTokenViaWID;
    /**
     * Fetches an external token.
     * @param FICClientId The FIC client ID.
     * @returns A promise that resolves to the external token.
     */
    private fetchExternalToken;
}
