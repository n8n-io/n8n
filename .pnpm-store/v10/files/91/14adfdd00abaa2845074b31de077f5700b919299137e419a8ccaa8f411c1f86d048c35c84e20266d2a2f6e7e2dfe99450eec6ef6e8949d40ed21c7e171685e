/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BridgeStatusCode } from "./BridgeStatusCode.js";

export type BridgeError = {
    status: BridgeStatusCode;
    code?: string; // auth_flow_last_error such as invalid_grant
    subError?: string; // server_suberror_code such as consent_required
    description?: string;
    properties?: object; // additional telemetry info
};

export function isBridgeError(error: unknown): error is BridgeError {
    return (error as BridgeError).status !== undefined;
}
