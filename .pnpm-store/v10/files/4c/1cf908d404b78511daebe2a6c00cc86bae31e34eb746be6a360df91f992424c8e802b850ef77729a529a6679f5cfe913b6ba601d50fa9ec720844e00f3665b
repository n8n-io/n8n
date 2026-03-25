/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const BridgeStatusCode = {
    UserInteractionRequired: "USER_INTERACTION_REQUIRED",
    UserCancel: "USER_CANCEL",
    NoNetwork: "NO_NETWORK",
    TransientError: "TRANSIENT_ERROR",
    PersistentError: "PERSISTENT_ERROR",
    Disabled: "DISABLED",
    AccountUnavailable: "ACCOUNT_UNAVAILABLE",
    NestedAppAuthUnavailable: "NESTED_APP_AUTH_UNAVAILABLE", // NAA is unavailable in the current context, can retry with standard browser based auth
} as const;
export type BridgeStatusCode =
    (typeof BridgeStatusCode)[keyof typeof BridgeStatusCode];
