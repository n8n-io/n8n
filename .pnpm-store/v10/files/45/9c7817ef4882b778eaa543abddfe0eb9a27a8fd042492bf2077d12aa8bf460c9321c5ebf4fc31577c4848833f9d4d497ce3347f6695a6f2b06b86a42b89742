// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDefaultHttpClient } from "@azure/core-rest-pipeline";
let _defaultHttpClient;
export function getCachedDefaultHttpClient() {
    if (!_defaultHttpClient) {
        _defaultHttpClient = createDefaultHttpClient();
    }
    return _defaultHttpClient;
}
//# sourceMappingURL=cache.js.map