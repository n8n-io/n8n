/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { StringDict } from "../utils/MsalTypes.js";

export type NativeRequest = {
    clientId: string;
    authority: string;
    correlationId: string;
    redirectUri: string;
    scopes: Array<string>;
    claims?: string;
    authenticationScheme?: string;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    shrNonce?: string;
    accountId?: string;
    forceRefresh?: boolean;
    extraParameters?: StringDict;
    extraScopesToConsent?: Array<string>;
    loginHint?: string;
    prompt?: string;
};
