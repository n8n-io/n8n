"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaggageScope = exports.BaggageBuilder = void 0;
const api_1 = require("@opentelemetry/api");
const constants_1 = require("../constants");
/**
 * Per request baggage builder for OpenTelemetry context propagation.
 *
 * This class provides a fluent API for setting baggage values that will be
 * propagated in the OpenTelemetry context.
 *
 * @example
 * ```typescript
 * const scope = new BaggageBuilder()
 *   .tenantId("tenant-123")
 *   .agentId("agent-456")
 *   .correlationId("corr-789")
 *   .build();
 *
 * scope.enter();
 * // Baggage is set in this context
 * // ... do work ...
 * scope.exit();
 * // Baggage is restored after exiting the context
 * ```
 */
class BaggageBuilder {
    constructor() {
        this.pairs = new Map();
    }
    /**
     * Set the operation source baggage value.
     * @param value The operation source value
     * @returns Self for method chaining
     */
    operationSource(value) {
        this.set(constants_1.OpenTelemetryConstants.OPERATION_SOURCE_KEY, value);
        return this;
    }
    /**
     * Set the tenant ID baggage value.
     * @param value The tenant ID
     * @returns Self for method chaining
     */
    tenantId(value) {
        this.set(constants_1.OpenTelemetryConstants.TENANT_ID_KEY, value);
        return this;
    }
    /**
     * Set the agent ID baggage value.
     * @param value The agent ID
     * @returns Self for method chaining
     */
    agentId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_ID_KEY, value);
        return this;
    }
    /**
     * Set the agent AUID baggage value.
     * @param value The agent AUID
     * @returns Self for method chaining
     */
    agentAuid(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_AUID_KEY, value);
        return this;
    }
    /**
     * Set the agent UPN baggage value.
     * @param value The agent UPN
     * @returns Self for method chaining
     */
    agentUpn(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_UPN_KEY, value);
        return this;
    }
    /**
     * Set the agent blueprint ID baggage value.
     * @param value The agent blueprint ID
     * @returns Self for method chaining
     */
    agentBlueprintId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_BLUEPRINT_ID_KEY, value);
        return this;
    }
    /**
     * Set the correlation ID baggage value.
     * @param value The correlation ID
     * @returns Self for method chaining
     */
    correlationId(value) {
        this.set(constants_1.OpenTelemetryConstants.CORRELATION_ID_KEY, value);
        return this;
    }
    /**
     * Set the session ID baggage value.
     * @param value The session ID
     * @returns Self for method chaining
     */
    sessionId(value) {
        this.set(constants_1.OpenTelemetryConstants.SESSION_ID_KEY, value);
        return this;
    }
    /**
     * Set the caller ID baggage value.
     * @param value The caller ID
     * @returns Self for method chaining
     */
    callerId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CALLER_ID_KEY, value);
        return this;
    }
    /**
     * Set the hiring manager ID baggage value.
     * @param value The hiring manager ID
     * @returns Self for method chaining
     */
    hiringManagerId(value) {
        this.set(constants_1.OpenTelemetryConstants.HIRING_MANAGER_ID_KEY, value);
        return this;
    }
    /**
     * Set the agent name baggage value.
     * @param value The agent name
     * @returns Self for method chaining
     */
    agentName(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_NAME_KEY, value);
        return this;
    }
    /**
     * Set the agent type baggage value.
     * @param value The agent type
     * @returns Self for method chaining
     */
    agentType(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_TYPE_KEY, value);
        return this;
    }
    /**
     * Set the agent description baggage value.
     * @param value The agent description
     * @returns Self for method chaining
     */
    agentDescription(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_DESCRIPTION_KEY, value);
        return this;
    }
    /**
     * Set the agent platform ID baggage value.
     * @param value The agent platform ID
     * @returns Self for method chaining
     */
    agentPlatformId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_AGENT_PLATFORM_ID_KEY, value);
        return this;
    }
    /**
     * Set the session description baggage value.
     * @param value The session description
     * @returns Self for method chaining
     */
    sessionDescription(value) {
        this.set(constants_1.OpenTelemetryConstants.SESSION_DESCRIPTION_KEY, value);
        return this;
    }
    /**
     * Set the caller name baggage value.
     * @param value The caller name
     * @returns Self for method chaining
     */
    callerName(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CALLER_NAME_KEY, value);
        return this;
    }
    /**
     * Set the caller UPN baggage value.
     * @param value The caller UPN
     * @returns Self for method chaining
     */
    callerUpn(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CALLER_UPN_KEY, value);
        return this;
    }
    /**
     * Set the caller client IP baggage value.
     * Used to capture the originating client IP for the request
     * so it can be propagated via OpenTelemetry baggage.
     * @param value The caller client IP address
     * @returns Self for method chaining
     */
    callerClientIp(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CALLER_CLIENT_IP_KEY, value);
        return this;
    }
    /**
     * Set the caller agent platform ID baggage value.
     * @param value The caller agent platform identifier
     * @returns Self for method chaining
     */
    callerAgentPlatformId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CALLER_AGENT_PLATFORM_ID_KEY, value);
        return this;
    }
    /**
     * Set the conversation ID baggage value.
     * @param value The conversation ID
     * @returns Self for method chaining
     */
    conversationId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CONVERSATION_ID_KEY, value);
        return this;
    }
    /**
     * Set the conversation item link baggage value.
     * @param value The conversation item link
     * @returns Self for method chaining
     */
    conversationItemLink(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_CONVERSATION_ITEM_LINK_KEY, value);
        return this;
    }
    /**
     * Set the execution source metadata ID (e.g., channel ID).
     * @param value The source metadata ID
     * @returns Self for method chaining
     */
    sourceMetadataId(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_ID_KEY, value);
        return this;
    }
    /**
     * Set the execution source metadata name (e.g., channel name).
     * @param value The source metadata name
     * @returns Self for method chaining
     */
    sourceMetadataName(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_NAME_KEY, value);
        return this;
    }
    /**
     * Set the execution source metadata description (e.g., channel description).
     * @param value The source metadata description
     * @returns Self for method chaining
     */
    sourceMetadataDescription(value) {
        this.set(constants_1.OpenTelemetryConstants.GEN_AI_EXECUTION_SOURCE_DESCRIPTION_KEY, value);
        return this;
    }
    /**
     * Set multiple baggage pairs from a dictionary or iterable.
     * @param pairs Dictionary or iterable of key-value pairs
     * @returns Self for method chaining
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPairs(pairs) {
        if (!pairs) {
            return this;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let entries;
        if (Symbol.iterator in Object(pairs)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entries = pairs;
        }
        else {
            entries = Object.entries(pairs);
        }
        for (const [key, value] of entries) {
            if (value !== null && value !== undefined) {
                this.set(key, String(value));
            }
        }
        return this;
    }
    /**
     * Apply the collected baggage to the current context.
     * @returns A context manager that restores the previous baggage on exit
     */
    build() {
        return new BaggageScope(this.pairs);
    }
    /**
     * Add a baggage key/value if the value is not null or whitespace.
     * @param key The baggage key
     * @param value The baggage value
     */
    set(key, value) {
        if (value !== null && value !== undefined) {
            const trimmed = value.trim();
            if (trimmed) {
                this.pairs.set(key, trimmed);
            }
        }
    }
    /**
     * Convenience method to begin a request baggage scope with common fields.
     * @param tenantId The tenant ID
     * @param agentId The agent ID
     * @param correlationId The correlation ID
     * @returns A context manager that restores the previous baggage on exit
     */
    static setRequestContext(tenantId, agentId, correlationId) {
        return new BaggageBuilder()
            .tenantId(tenantId)
            .agentId(agentId)
            .correlationId(correlationId)
            .build();
    }
}
exports.BaggageBuilder = BaggageBuilder;
/**
 * Context manager for baggage scope.
 *
 * This class manages the lifecycle of baggage values, setting them on enter
 * and restoring the previous context on exit.
 */
class BaggageScope {
    constructor(pairs) {
        // 1. Start from current active context
        const currentCtx = api_1.context.active();
        // 2. Build merged baggage
        let bag = api_1.propagation.getBaggage(currentCtx) ?? api_1.propagation.createBaggage({});
        for (const [key, value] of pairs.entries()) {
            if (value && value.trim()) {
                bag = bag.setEntry(key, { value });
            }
        }
        // 3. Create a new context that carries that baggage
        this.contextWithBaggage = api_1.propagation.setBaggage(currentCtx, bag);
    }
    /**
     * Execute a synchronous function under this baggage scope.
     * Automatically restores previous context afterward.
     */
    run(fn) {
        return api_1.context.with(this.contextWithBaggage, fn);
    }
    /**
     * Dispose is a no-op because OpenTelemetry JS automatically restores
     * the previous context after `context.with()` completes.
     */
    [Symbol.dispose]() {
        // Nothing to detach manually; context restoration happens automatically.
    }
    /**
     * Manual cleanup alternative if caller isn't using `using`.
     */
    dispose() {
        this[Symbol.dispose]();
    }
}
exports.BaggageScope = BaggageScope;
//# sourceMappingURL=BaggageBuilder.js.map