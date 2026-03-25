"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedDefaultHttpClient = void 0;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
let cachedHttpClient;
function getCachedDefaultHttpClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = (0, core_rest_pipeline_1.createDefaultHttpClient)();
    }
    return cachedHttpClient;
}
exports.getCachedDefaultHttpClient = getCachedDefaultHttpClient;
//# sourceMappingURL=httpClientCache.js.map