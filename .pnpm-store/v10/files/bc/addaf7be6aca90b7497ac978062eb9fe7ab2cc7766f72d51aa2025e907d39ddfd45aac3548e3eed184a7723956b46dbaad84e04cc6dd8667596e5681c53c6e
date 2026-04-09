"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyVaultKeyPollOperation = exports.KeyVaultKeyPoller = void 0;
const core_util_1 = require("@azure/core-util");
const core_lro_1 = require("@azure/core-lro");
/**
 * Common properties and methods of the Key Vault Key Pollers.
 */
class KeyVaultKeyPoller extends core_lro_1.Poller {
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
        return (0, core_util_1.delay)(this.intervalInMs);
    }
}
exports.KeyVaultKeyPoller = KeyVaultKeyPoller;
/**
 * Common properties and methods of the Key Vault Key Poller operations.
 */
class KeyVaultKeyPollOperation {
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
exports.KeyVaultKeyPollOperation = KeyVaultKeyPollOperation;
//# sourceMappingURL=keyVaultKeyPoller.js.map