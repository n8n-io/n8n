"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoverDeletedKeyPollOperation = void 0;
const tracing_js_1 = require("../../tracing.js");
const transformations_js_1 = require("../../transformations.js");
const keyVaultKeyPoller_js_1 = require("../keyVaultKeyPoller.js");
class RecoverDeletedKeyPollOperation extends keyVaultKeyPoller_js_1.KeyVaultKeyPollOperation {
    constructor(state, client, operationOptions = {}) {
        super(state, { cancelMessage: "Canceling the recovery of a deleted key is not supported." });
        this.state = state;
        this.client = client;
        this.operationOptions = operationOptions;
    }
    /**
     * The getKey method gets a specified key and is applicable to any key stored in Azure Key Vault.
     * This operation requires the keys/get permission.
     */
    getKey(name, options = {}) {
        return tracing_js_1.tracingClient.withSpan("RecoverDeleteKeyPoller.getKey", options, async (updatedOptions) => {
            const response = await this.client.getKey(name, (updatedOptions === null || updatedOptions === void 0 ? void 0 : updatedOptions.version) || "", updatedOptions);
            return (0, transformations_js_1.getKeyFromKeyBundle)(response);
        });
    }
    /**
     * Sends a request to recover a deleted Key Vault Key based on the given name.
     * Since the Key Vault Key won't be immediately recover the deleted key, we have {@link beginRecoverDeletedKey}.
     */
    async recoverDeletedKey(name, options = {}) {
        return tracing_js_1.tracingClient.withSpan("RecoverDeletedKeyPoller.recoverDeleteKey", options, async (updatedOptions) => {
            const response = await this.client.recoverDeletedKey(name, updatedOptions);
            return (0, transformations_js_1.getKeyFromKeyBundle)(response);
        });
    }
    /**
     * Reaches to the service and updates the delete key's poll operation.
     */
    async update(options = {}) {
        const state = this.state;
        const { name } = state;
        const operationOptions = this.operationOptions;
        if (options.abortSignal) {
            operationOptions.abortSignal = options.abortSignal;
        }
        if (!state.isStarted) {
            try {
                state.result = await this.getKey(name, operationOptions);
                state.isCompleted = true;
            }
            catch (_a) {
                // Nothing to do here.
            }
            if (!state.isCompleted) {
                state.result = await this.recoverDeletedKey(name, operationOptions);
                state.isStarted = true;
            }
        }
        if (!state.isCompleted) {
            try {
                state.result = await this.getKey(name, operationOptions);
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
exports.RecoverDeletedKeyPollOperation = RecoverDeletedKeyPollOperation;
//# sourceMappingURL=operation.js.map