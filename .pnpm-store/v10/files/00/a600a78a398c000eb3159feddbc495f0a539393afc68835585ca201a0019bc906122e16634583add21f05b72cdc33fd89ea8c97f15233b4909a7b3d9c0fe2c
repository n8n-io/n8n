/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PlatformAuthRequest } from "./PlatformAuthRequest.js";
import { PlatformAuthResponse } from "./PlatformAuthResponse.js";

/**
 * Interface for the Platform Broker Handlers
 */
export interface IPlatformAuthHandler {
    getExtensionId(): string | undefined;
    getExtensionVersion(): string | undefined;
    getExtensionName(): string | undefined;
    sendMessage(request: PlatformAuthRequest): Promise<PlatformAuthResponse>;
}
