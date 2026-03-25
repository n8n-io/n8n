/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthenticationResult,
    IAppTokenProvider,
    Logger,
} from "@azure/msal-common/node";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { AuthorizationUrlRequest } from "../request/AuthorizationUrlRequest.js";
import { ClientCredentialRequest } from "../request/ClientCredentialRequest.js";
import { OnBehalfOfRequest } from "../request/OnBehalfOfRequest.js";
import { RefreshTokenRequest } from "../request/RefreshTokenRequest.js";
import { SilentFlowRequest } from "../request/SilentFlowRequest.js";
import { UsernamePasswordRequest } from "../request/UsernamePasswordRequest.js";
import { TokenCache } from "../cache/TokenCache.js";

/**
 * Interface for the ConfidentialClientApplication class defining the public API signatures
 * @public
 */
export interface IConfidentialClientApplication {
    /** Creates the URL of the authorization request */
    getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;

    /**  Acquires a token by exchanging the authorization code received from the first step of OAuth 2.0 Authorization Code Flow */
    acquireTokenByCode(
        request: AuthorizationCodeRequest
    ): Promise<AuthenticationResult>;

    /**  Acquires a token silently when a user specifies the account the token is requested for */
    acquireTokenSilent(
        request: SilentFlowRequest
    ): Promise<AuthenticationResult | null>;

    /** Acquires a token by exchanging the refresh token provided for a new set of tokens */
    acquireTokenByRefreshToken(
        request: RefreshTokenRequest
    ): Promise<AuthenticationResult | null>;

    /** Acquires tokens from the authority for the application (not for an end user) */
    acquireTokenByClientCredential(
        request: ClientCredentialRequest
    ): Promise<AuthenticationResult | null>;

    /** Acquires tokens from the authority for the application */
    acquireTokenOnBehalfOf(
        request: OnBehalfOfRequest
    ): Promise<AuthenticationResult | null>;

    /**
     * Acquires tokens with password grant by exchanging client applications username and password for credentials
     * @deprecated - Use a more secure flow instead
     */
    acquireTokenByUsernamePassword(
        request: UsernamePasswordRequest
    ): Promise<AuthenticationResult | null>;

    /** Gets the token cache for the application */
    getTokenCache(): TokenCache;

    /** Returns the logger instance */
    getLogger(): Logger;

    /** Replaces the default logger set in configurations with new Logger with new configurations */
    setLogger(logger: Logger): void;

    /** Clear the cache */
    clearCache(): void;

    /** This extensibility point is meant for Azure SDK to enhance Managed Identity support */
    SetAppTokenProvider(provider: IAppTokenProvider): void;
}
