// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { delay } from "@azure/core-util";
import { Poller } from "@azure/core-lro";
/**
 * Common properties and methods of the Key Vault Key Pollers.
 */
export class KeyVaultKeyPoller extends Poller {
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
 * Common properties and methods of the Key Vault Key Poller operations.
 */
export class KeyVaultKeyPollOperation {
    constructor(state, options = {}) {
        this.state = state;
        this.cancelMessage = "";
        if (options.cancelMessage) {
            this.cancelMessage = options.cancelMessage;
        }
    }
    /**
     * Meant to reach to the service and update the Poller operation.
     */
    async update() {
        throw new Error("Operation not supported.");
    }
    /**
     * Meant to reach to the service and cancel the Poller operation.
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
//# sourceMappingURL=keyVaultKeyPoller.js.map