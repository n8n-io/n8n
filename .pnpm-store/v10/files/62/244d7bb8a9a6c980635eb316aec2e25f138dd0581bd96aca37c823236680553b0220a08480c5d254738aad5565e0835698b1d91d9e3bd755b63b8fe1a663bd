/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthorizeResponse } from "@azure/msal-common/node";

/**
 * Interface for LoopbackClient allowing to replace the default loopback server with a custom implementation.
 * @public
 */
export interface ILoopbackClient {
    listenForAuthCode(
        successTemplate?: string,
        errorTemplate?: string
    ): Promise<AuthorizeResponse>;
    getRedirectUri(): string;
    closeServer(): void;
}
