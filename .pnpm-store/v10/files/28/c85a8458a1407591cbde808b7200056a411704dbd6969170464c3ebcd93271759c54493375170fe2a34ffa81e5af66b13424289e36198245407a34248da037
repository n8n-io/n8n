/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TokenRequest } from "./TokenRequest.js";

export type BridgeMethods = "GetToken" | "GetInitContext" | "GetTokenPopup";

export type BridgeRequestEnvelope = {
    messageType: "NestedAppAuthRequest";
    method: BridgeMethods;
    sendTime?: number; // Assume this is epoch
    clientLibrary?: string;
    clientLibraryVersion?: string;
    requestId: string;
    tokenParams?: TokenRequest;
};

export function isBridgeRequestEnvelope(
    obj: unknown
): obj is BridgeRequestEnvelope {
    return (
        (obj as BridgeRequestEnvelope).messageType !== undefined &&
        (obj as BridgeRequestEnvelope).messageType === "NestedAppAuthRequest" &&
        (obj as BridgeRequestEnvelope).method !== undefined &&
        (obj as BridgeRequestEnvelope).requestId !== undefined
    );
}
