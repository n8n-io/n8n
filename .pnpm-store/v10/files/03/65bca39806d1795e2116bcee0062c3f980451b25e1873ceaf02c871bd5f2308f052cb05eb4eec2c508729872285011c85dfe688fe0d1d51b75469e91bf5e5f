/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BridgeError } from "./BridgeError.js";
import { TokenResponse } from "./TokenResponse.js";
import { AccountInfo } from "./AccountInfo.js";
import { InitContext } from "./InitContext.js";

export type BridgeResponseEnvelope = {
    messageType: "NestedAppAuthResponse";
    requestId: string;
    success: boolean; // false if body is error
    token?: TokenResponse;
    error?: BridgeError;
    account?: AccountInfo;
    initContext?: InitContext;
};
