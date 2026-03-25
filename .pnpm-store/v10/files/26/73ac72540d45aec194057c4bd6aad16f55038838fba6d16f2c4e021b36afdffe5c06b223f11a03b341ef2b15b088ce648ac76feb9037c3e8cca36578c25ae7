/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const EventType = {
    INITIALIZE_START: "msal:initializeStart",
    INITIALIZE_END: "msal:initializeEnd",
    ACCOUNT_ADDED: "msal:accountAdded",
    ACCOUNT_REMOVED: "msal:accountRemoved",
    ACTIVE_ACCOUNT_CHANGED: "msal:activeAccountChanged",
    LOGIN_START: "msal:loginStart",
    LOGIN_SUCCESS: "msal:loginSuccess",
    LOGIN_FAILURE: "msal:loginFailure",
    ACQUIRE_TOKEN_START: "msal:acquireTokenStart",
    ACQUIRE_TOKEN_SUCCESS: "msal:acquireTokenSuccess",
    ACQUIRE_TOKEN_FAILURE: "msal:acquireTokenFailure",
    ACQUIRE_TOKEN_NETWORK_START: "msal:acquireTokenFromNetworkStart",
    SSO_SILENT_START: "msal:ssoSilentStart",
    SSO_SILENT_SUCCESS: "msal:ssoSilentSuccess",
    SSO_SILENT_FAILURE: "msal:ssoSilentFailure",
    ACQUIRE_TOKEN_BY_CODE_START: "msal:acquireTokenByCodeStart",
    ACQUIRE_TOKEN_BY_CODE_SUCCESS: "msal:acquireTokenByCodeSuccess",
    ACQUIRE_TOKEN_BY_CODE_FAILURE: "msal:acquireTokenByCodeFailure",
    HANDLE_REDIRECT_START: "msal:handleRedirectStart",
    HANDLE_REDIRECT_END: "msal:handleRedirectEnd",
    POPUP_OPENED: "msal:popupOpened",
    LOGOUT_START: "msal:logoutStart",
    LOGOUT_SUCCESS: "msal:logoutSuccess",
    LOGOUT_FAILURE: "msal:logoutFailure",
    LOGOUT_END: "msal:logoutEnd",
    RESTORE_FROM_BFCACHE: "msal:restoreFromBFCache",
    BROKER_CONNECTION_ESTABLISHED: "msal:brokerConnectionEstablished",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];
