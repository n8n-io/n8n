/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { ExternalTokenResponse } from "@azure/msal-common/browser";
import type { SilentRequest } from "../request/SilentRequest.js";
import type { LoadTokenOptions } from "./TokenCache.js";
import type { AuthenticationResult } from "../response/AuthenticationResult.js";

export interface ITokenCache {
    /**
     * API to side-load tokens to MSAL cache
     * @returns `AuthenticationResult` for the response that was loaded.
     */
    loadExternalTokens(
        request: SilentRequest,
        response: ExternalTokenResponse,
        options: LoadTokenOptions
    ): Promise<AuthenticationResult>;
}
