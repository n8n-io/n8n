/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CloudDiscoveryMetadata } from "./CloudDiscoveryMetadata.js";

/**
 * The OpenID Configuration Endpoint Response type. Used by the authority class to get relevant OAuth endpoints.
 */
export type CloudInstanceDiscoveryResponse = {
    tenant_discovery_endpoint: string;
    metadata: Array<CloudDiscoveryMetadata>;
};

export function isCloudInstanceDiscoveryResponse(response: object): boolean {
    return (
        response.hasOwnProperty("tenant_discovery_endpoint") &&
        response.hasOwnProperty("metadata")
    );
}
