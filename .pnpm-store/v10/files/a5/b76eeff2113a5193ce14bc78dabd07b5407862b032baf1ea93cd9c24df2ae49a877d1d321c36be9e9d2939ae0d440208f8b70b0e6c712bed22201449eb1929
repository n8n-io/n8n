/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type AuthBridgeResponse = string | { data: string };
export interface AuthBridge {
    addEventListener: (
        eventName: string,
        callback: (response: AuthBridgeResponse) => void
    ) => void;
    postMessage: (message: string) => void;
    removeEventListener: (
        eventName: string,
        callback: (response: AuthBridgeResponse) => void
    ) => void;
}
