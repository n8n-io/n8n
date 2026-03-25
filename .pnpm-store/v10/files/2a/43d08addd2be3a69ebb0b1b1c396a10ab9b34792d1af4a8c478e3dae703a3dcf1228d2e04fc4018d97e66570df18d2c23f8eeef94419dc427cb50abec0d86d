/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type TokenRequest = {
    platformBrokerId?: string; // Account identifier used by OneAuth
    clientId: string;
    authority?: string;
    scope: string;
    correlationId: string;
    claims?: string;
    state?: string;
    reqCnf?: string; // Having OneAuth own the keypair is better for hardware token binding support
    keyId?: string; // Having OneAuth own the keypair is better for hardware token binding support
    authenticationScheme?: string;
    shrClaims?: string;
    shrNonce?: string;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    extendedExpiryToken?: boolean;
    extraParameters?: Map<string, string>;
    forceRefresh?: boolean;
};
