// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDefaultHttpClient } from "@azure/core-rest-pipeline";
let cachedHttpClient;
export function getCachedDefaultHttpClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = createDefaultHttpClient();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=httpClientCache.js.map