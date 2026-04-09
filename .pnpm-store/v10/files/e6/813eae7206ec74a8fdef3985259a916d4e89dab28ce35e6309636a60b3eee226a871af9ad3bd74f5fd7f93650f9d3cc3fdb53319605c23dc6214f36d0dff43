"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedDefaultHttpClient = getCachedDefaultHttpClient;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
let cachedHttpClient;
function getCachedDefaultHttpClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = (0, core_rest_pipeline_1.createDefaultHttpClient)();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=httpClientCache.js.map