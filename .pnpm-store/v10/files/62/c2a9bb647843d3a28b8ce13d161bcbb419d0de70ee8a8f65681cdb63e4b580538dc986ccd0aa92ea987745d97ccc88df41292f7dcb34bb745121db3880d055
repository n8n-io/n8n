"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentApplicationBuilder = void 0;
const agentApplication_1 = require("./agentApplication");
/**
 * Builder class for creating and configuring AgentApplication instances.
 * @typeParam TState Type extending TurnState that will be used by the application
 */
class AgentApplicationBuilder {
    constructor() {
        this._options = {};
    }
    /**
     * Gets the current options for the AgentApplication being built.
     * @returns The current options object
     */
    get options() {
        return this._options;
    }
    /**
     * Sets the storage provider for the AgentApplication.
     * @param storage The storage implementation to use
     * @returns This builder instance for chaining
     */
    withStorage(storage) {
        this._options.storage = storage;
        return this;
    }
    /**
     * Sets the factory function to create new TurnState instances.
     * @param turnStateFactory Function that creates a new TurnState
     * @returns This builder instance for chaining
     */
    withTurnStateFactory(turnStateFactory) {
        this._options.turnStateFactory = turnStateFactory;
        return this;
    }
    /**
     * Configures whether the agent should display typing indicators.
     * @param startTypingTimer Whether to show typing indicators
     * @returns This builder instance for chaining
     */
    // public setStartTypingTimer (startTypingTimer: boolean): this {
    //   this._options.startTypingTimer = startTypingTimer
    //   return this
    // }
    /**
     * Sets authentication options for the AgentApplication.
     * @param authHandlers The user identity authentication options
     * @returns This builder instance for chaining
     */
    withAuthorization(authHandlers) {
        this._options.authorization = authHandlers;
        return this;
    }
    /**
     * Builds and returns a new AgentApplication instance configured with the provided options.
     * @returns A new AgentApplication instance
     */
    build() {
        return new agentApplication_1.AgentApplication(this._options);
    }
}
exports.AgentApplicationBuilder = AgentApplicationBuilder;
//# sourceMappingURL=agentApplicationBuilder.js.map