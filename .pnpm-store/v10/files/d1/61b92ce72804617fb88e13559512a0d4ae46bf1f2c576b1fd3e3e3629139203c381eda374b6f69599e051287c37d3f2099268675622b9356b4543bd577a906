/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccountFilter,
    AccountInfo,
    Logger,
    PerformanceCallbackFunction,
} from "@azure/msal-common/browser";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import {
    BrowserConfigurationAuthErrorCodes,
    createBrowserConfigurationAuthError,
} from "../error/BrowserConfigurationAuthError.js";
import { WrapperSKU } from "../utils/BrowserConstants.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { ITokenCache } from "../cache/ITokenCache.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { EventCallbackFunction } from "../event/EventMessage.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { InitializeApplicationRequest } from "../request/InitializeApplicationRequest.js";
import { EventType } from "../event/EventType.js";

export interface IPublicClientApplication {
    // TODO: Make request mandatory in the next major version?
    initialize(request?: InitializeApplicationRequest): Promise<void>;
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult>;
    acquireTokenRedirect(request: RedirectRequest): Promise<void>;
    acquireTokenSilent(
        silentRequest: SilentRequest
    ): Promise<AuthenticationResult>;
    acquireTokenByCode(
        request: AuthorizationCodeRequest
    ): Promise<AuthenticationResult>;
    addEventCallback(
        callback: EventCallbackFunction,
        eventTypes?: Array<EventType>
    ): string | null;
    removeEventCallback(callbackId: string): void;
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    removePerformanceCallback(callbackId: string): boolean;
    enableAccountStorageEvents(): void;
    disableAccountStorageEvents(): void;
    getAccount(accountFilter: AccountFilter): AccountInfo | null;
    getAccountByHomeId(homeAccountId: string): AccountInfo | null;
    getAccountByLocalId(localId: string): AccountInfo | null;
    getAccountByUsername(userName: string): AccountInfo | null;
    getAllAccounts(): AccountInfo[];
    handleRedirectPromise(hash?: string): Promise<AuthenticationResult | null>;
    loginPopup(request?: PopupRequest): Promise<AuthenticationResult>;
    loginRedirect(request?: RedirectRequest): Promise<void>;
    logout(logoutRequest?: EndSessionRequest): Promise<void>;
    logoutRedirect(logoutRequest?: EndSessionRequest): Promise<void>;
    logoutPopup(logoutRequest?: EndSessionPopupRequest): Promise<void>;
    ssoSilent(request: SsoSilentRequest): Promise<AuthenticationResult>;
    getTokenCache(): ITokenCache;
    getLogger(): Logger;
    setLogger(logger: Logger): void;
    setActiveAccount(account: AccountInfo | null): void;
    getActiveAccount(): AccountInfo | null;
    initializeWrapperLibrary(sku: WrapperSKU, version: string): void;
    setNavigationClient(navigationClient: INavigationClient): void;
    /** @internal */
    getConfiguration(): BrowserConfiguration;
    hydrateCache(
        result: AuthenticationResult,
        request:
            | SilentRequest
            | SsoSilentRequest
            | RedirectRequest
            | PopupRequest
    ): Promise<void>;
    clearCache(logoutRequest?: ClearCacheRequest): Promise<void>;
}

export const stubbedPublicClientApplication: IPublicClientApplication = {
    initialize: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    acquireTokenPopup: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    acquireTokenRedirect: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    acquireTokenSilent: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    acquireTokenByCode: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    getAllAccounts: () => {
        return [];
    },
    getAccount: () => {
        return null;
    },
    getAccountByHomeId: () => {
        return null;
    },
    getAccountByUsername: () => {
        return null;
    },
    getAccountByLocalId: () => {
        return null;
    },
    handleRedirectPromise: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    loginPopup: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    loginRedirect: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    logout: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    logoutRedirect: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    logoutPopup: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    ssoSilent: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    addEventCallback: () => {
        return null;
    },
    removeEventCallback: () => {
        return;
    },
    addPerformanceCallback: () => {
        return "";
    },
    removePerformanceCallback: () => {
        return false;
    },
    enableAccountStorageEvents: () => {
        return;
    },
    disableAccountStorageEvents: () => {
        return;
    },
    getTokenCache: () => {
        throw createBrowserConfigurationAuthError(
            BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
        );
    },
    getLogger: () => {
        throw createBrowserConfigurationAuthError(
            BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
        );
    },
    setLogger: () => {
        return;
    },
    setActiveAccount: () => {
        return;
    },
    getActiveAccount: () => {
        return null;
    },
    initializeWrapperLibrary: () => {
        return;
    },
    setNavigationClient: () => {
        return;
    },
    getConfiguration: () => {
        throw createBrowserConfigurationAuthError(
            BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
        );
    },
    hydrateCache: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
    clearCache: () => {
        return Promise.reject(
            createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.stubbedPublicClientApplicationCalled
            )
        );
    },
};
