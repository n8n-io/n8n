/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BridgeResponseEnvelope } from "./BridgeResponseEnvelope.js";

export type BridgeRequest = {
    requestId: string;
    method: string;
    resolve: (
        value: BridgeResponseEnvelope | PromiseLike<BridgeResponseEnvelope>
    ) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void;
};
