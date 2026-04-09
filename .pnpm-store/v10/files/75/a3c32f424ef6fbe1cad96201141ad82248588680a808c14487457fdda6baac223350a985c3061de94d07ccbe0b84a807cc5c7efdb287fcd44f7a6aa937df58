"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteKeyPoller = void 0;
const operation_js_1 = require("./operation.js");
const keyVaultKeyPoller_js_1 = require("../keyVaultKeyPoller.js");
/**
 * Class that creates a poller that waits until a key finishes being deleted.
 */
class DeleteKeyPoller extends keyVaultKeyPoller_js_1.KeyVaultKeyPoller {
    constructor(options) {
        const { client, name, operationOptions, intervalInMs = 2000, resumeFrom } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = new operation_js_1.DeleteKeyPollOperation(Object.assign(Object.assign({}, state), { name }), client, operationOptions);
        super(operation);
        this.intervalInMs = intervalInMs;
    }
}
exports.DeleteKeyPoller = DeleteKeyPoller;
//# sourceMappingURL=poller.js.map