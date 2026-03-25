/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createBrowserConfigurationAuthError } from '../error/BrowserConfigurationAuthError.mjs';
import { stubbedPublicClientApplicationCalled } from '../error/BrowserConfigurationAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const stubbedPublicClientApplication = {
    initialize: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenSilent: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenByCode: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
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
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    loginPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    loginRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logout: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logoutRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logoutPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    ssoSilent: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
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
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
    },
    getLogger: () => {
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
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
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
    },
    hydrateCache: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    clearCache: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
};

export { stubbedPublicClientApplication };
//# sourceMappingURL=IPublicClientApplication.mjs.map
