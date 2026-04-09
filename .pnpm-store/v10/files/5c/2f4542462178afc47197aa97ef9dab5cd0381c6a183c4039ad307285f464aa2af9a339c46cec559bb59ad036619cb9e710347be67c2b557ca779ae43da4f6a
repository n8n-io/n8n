"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteKeyPollOperation = void 0;
const tracing_js_1 = require("../../tracing.js");
const transformations_js_1 = require("../../transformations.js");
const keyVaultKeyPoller_js_1 = require("../keyVaultKeyPoller.js");
class DeleteKeyPollOperation extends keyVaultKeyPoller_js_1.KeyVaultKeyPollOperation {
    constructor(state, client, operationOptions = {}) {
        super(state, { cancelMessage: "Canceling the deletion of a key is not supported." });
        this.state = state;
        this.client = client;
        this.operationOptions = operationOptions;
    }
    /**
     * Sends a delete request for the given Key Vault Key's name to the Key Vault service.
     * Since the Key Vault Key won't be immediately deleted, we have {@link beginDeleteKey}.
     */
    deleteKey(name, options = {}) {
        return tracing_js_1.tracingClient.withSpan("DeleteKeyPoller.deleteKey", options, async (updatedOptions) => {
            const response = await this.client.deleteKey(name, updatedOptions);
            return (0, transformations_js_1.getKeyFromKeyBundle)(response);
        });
    }
    /**
     * The getDeletedKey method returns the specified deleted key along with its properties.
     * This operation requires the keys/get permission.
     */
    getDeletedKey(name, options = {}) {
        return tracing_js_1.tracingClient.withSpan("DeleteKeyPoller.getDeletedKey", options, async (updatedOptions) => {
            const response = await this.client.getDeletedKey(name, updatedOptions);
            return (0, transformations_js_1.getKeyFromKeyBundle)(response);
        });
    }
    /**
     * Reaches to the service and updates the delete key's poll operation.
     */
    async update(options = {}) {
        const state = this.state;
        const { name } = state;
        if (options.abortSignal) {
            this.operationOptions.abortSignal = options.abortSignal;
        }
        if (!state.isStarted) {
            const deletedKey = await this.deleteKey(name, this.operationOptions);
            state.isStarted = true;
            state.result = deletedKey;
            if (!deletedKey.properties.recoveryId) {
                state.isCompleted = true;
            }
        }
        if (!state.isCompleted) {
            try {
                state.result = await this.getDeletedKey(name, this.operationOptions);
                state.isCompleted = true;
            }
            catch (error) {
                if (error.statusCode === 403) {
                    // At this point, the resource exists but the user doesn't have access to it.
                    state.isCompleted = true;
                }
                else if (error.statusCode !== 404) {
                    state.error = error;
                    state.isCompleted = true;
                    throw error;
                }
            }
        }
        return this;
    }
}
exports.DeleteKeyPollOperation = DeleteKeyPollOperation;
//# sourceMappingURL=operation.js.map