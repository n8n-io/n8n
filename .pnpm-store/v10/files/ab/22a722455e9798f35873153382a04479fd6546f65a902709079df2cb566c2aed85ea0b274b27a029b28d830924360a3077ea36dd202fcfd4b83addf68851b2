// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Poller } from "@azure/core-lro";
import { delay } from "@azure/core-util";
/**
 * Common properties and methods of the Key Vault Secret Pollers.
 */
export class KeyVaultSecretPoller extends Poller {
    constructor() {
        super(...arguments);
        /**
         * Defines how much time the poller is going to wait before making a new request to the service.
         */
        this.intervalInMs = 2000;
    }
    /**
     * The method used by the poller to wait before attempting to update its operation.
     */
    async delay() {
        return delay(this.intervalInMs);
    }
}
/**
 * Common properties and methods of the Key Vault Secret Poller operations.
 */
// eslint-disable-next-next no-use-before-define
export class KeyVaultSecretPollOperation {
    constructor(state, options = {}) {
        this.state = state;
        this.cancelMessage = "";
        if (options.cancelMessage) {
            this.cancelMessage = options.cancelMessage;
        }
    }
    /**
     * Meant to reach to the service and update the Poller operation.
     * @param options - The optional parameters, which is only an abortSignal from \@azure/abort-controller
     */
    async update() {
        throw new Error("Operation not supported.");
    }
    /**
     * Meant to reach to the service and cancel the Poller operation.
     * @param options - The optional parameters, which is only an abortSignal from \@azure/abort-controller
     */
    async cancel() {
        throw new Error(this.cancelMessage);
    }
    /**
     * Serializes the Poller operation.
     */
    toString() {
        return JSON.stringify({
            state: this.state,
        });
    }
}
//# sourceMappingURL=keyVaultSecretPoller.js.map