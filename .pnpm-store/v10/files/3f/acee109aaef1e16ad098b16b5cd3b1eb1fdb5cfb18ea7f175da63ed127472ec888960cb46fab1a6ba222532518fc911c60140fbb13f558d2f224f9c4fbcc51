/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Protocol modes supported by MSAL.
 */
export const ProtocolMode = {
    /**
     * Auth Code + PKCE with Entra ID (formerly AAD) specific optimizations and features
     */
    AAD: "AAD",
    /**
     * Auth Code + PKCE without Entra ID specific optimizations and features. For use only with non-Microsoft owned authorities.
     * Support is limited for this mode.
     */
    OIDC: "OIDC",
    /**
     * Encrypted Authorize Response (EAR) with Entra ID specific optimizations and features
     */
    EAR: "EAR",
} as const;
export type ProtocolMode = (typeof ProtocolMode)[keyof typeof ProtocolMode];
