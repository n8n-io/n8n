// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { KeyVaultSecretPollOperation, } from "../keyVaultSecretPoller";
import { getSecretFromSecretBundle } from "../../transformations";
import { tracingClient } from "../../tracing";
/**
 * An interface representing a delete secret's poll operation
 */
export class RecoverDeletedSecretPollOperation extends KeyVaultSecretPollOperation {
    constructor(state, vaultUrl, client, options = {}) {
        super(state, { cancelMessage: "Canceling the recovery of a deleted secret is not supported." });
        this.state = state;
        this.vaultUrl = vaultUrl;
        this.client = client;
        this.options = options;
    }
    /**
     * The getSecret method returns the specified secret along with its properties.
     * This operation requires the secrets/get permission.
     */
    getSecret(name, options = {}) {
        return tracingClient.withSpan("RecoverDeletedSecretPoller.getSecret", options, async (updatedOptions) => {
            const response = await this.client.getSecret(this.vaultUrl, name, options && options.version ? options.version : "", updatedOptions);
            return getSecretFromSecretBundle(response);
        });
    }
    /**
     * The recoverDeletedSecret method recovers the specified deleted secret along with its properties.
     * This operation requires the secrets/recover permission.
     */
    recoverDeletedSecret(name, options = {}) {
        return tracingClient.withSpan("RecoverDeletedSecretPoller.recoverDeletedSecret", options, async (updatedOptions) => {
            const response = await this.client.recoverDeletedSecret(this.vaultUrl, name, updatedOptions);
            return getSecretFromSecretBundle(response);
        });
    }
    /**
     * Reaches to the service and updates the delete secret's poll operation.
     */
    async update(options = {}) {
        const state = this.state;
        const { name } = state;
        if (options.abortSignal) {
            this.options.abortSignal = options.abortSignal;
        }
        if (!state.isStarted) {
            try {
                state.result = (await this.getSecret(name, this.options)).properties;
                state.isCompleted = true;
            }
            catch (_a) {
                // Nothing to do here.
            }
            if (!state.isCompleted) {
                state.result = (await this.recoverDeletedSecret(name, this.options)).properties;
                state.isStarted = true;
            }
        }
        if (!state.isCompleted) {
            try {
                state.result = (await this.getSecret(name, this.options)).properties;
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
//# sourceMappingURL=operation.js.map