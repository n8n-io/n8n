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
export declare class BaggageBuilder {
    private pairs;
    /**
     * Set the operation source baggage value.
     * @param value The operation source value
     * @returns Self for method chaining
     */
    operationSource(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the tenant ID baggage value.
     * @param value The tenant ID
     * @returns Self for method chaining
     */
    tenantId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent ID baggage value.
     * @param value The agent ID
     * @returns Self for method chaining
     */
    agentId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent AUID baggage value.
     * @param value The agent AUID
     * @returns Self for method chaining
     */
    agentAuid(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent UPN baggage value.
     * @param value The agent UPN
     * @returns Self for method chaining
     */
    agentUpn(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent blueprint ID baggage value.
     * @param value The agent blueprint ID
     * @returns Self for method chaining
     */
    agentBlueprintId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the correlation ID baggage value.
     * @param value The correlation ID
     * @returns Self for method chaining
     */
    correlationId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the session ID baggage value.
     * @param value The session ID
     * @returns Self for method chaining
     */
    sessionId(value: string): BaggageBuilder;
    /**
     * Set the caller ID baggage value.
     * @param value The caller ID
     * @returns Self for method chaining
     */
    callerId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the hiring manager ID baggage value.
     * @param value The hiring manager ID
     * @returns Self for method chaining
     */
    hiringManagerId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent name baggage value.
     * @param value The agent name
     * @returns Self for method chaining
     */
    agentName(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent type baggage value.
     * @param value The agent type
     * @returns Self for method chaining
     */
    agentType(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent description baggage value.
     * @param value The agent description
     * @returns Self for method chaining
     */
    agentDescription(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the agent platform ID baggage value.
     * @param value The agent platform ID
     * @returns Self for method chaining
     */
    agentPlatformId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the session description baggage value.
     * @param value The session description
     * @returns Self for method chaining
     */
    sessionDescription(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the caller name baggage value.
     * @param value The caller name
     * @returns Self for method chaining
     */
    callerName(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the caller UPN baggage value.
     * @param value The caller UPN
     * @returns Self for method chaining
     */
    callerUpn(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the caller client IP baggage value.
     * Used to capture the originating client IP for the request
     * so it can be propagated via OpenTelemetry baggage.
     * @param value The caller client IP address
     * @returns Self for method chaining
     */
    callerClientIp(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the caller agent platform ID baggage value.
     * @param value The caller agent platform identifier
     * @returns Self for method chaining
     */
    callerAgentPlatformId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the conversation ID baggage value.
     * @param value The conversation ID
     * @returns Self for method chaining
     */
    conversationId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the conversation item link baggage value.
     * @param value The conversation item link
     * @returns Self for method chaining
     */
    conversationItemLink(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the execution source metadata ID (e.g., channel ID).
     * @param value The source metadata ID
     * @returns Self for method chaining
     */
    sourceMetadataId(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the execution source metadata name (e.g., channel name).
     * @param value The source metadata name
     * @returns Self for method chaining
     */
    sourceMetadataName(value: string | null | undefined): BaggageBuilder;
    /**
     * Set the execution source metadata description (e.g., channel description).
     * @param value The source metadata description
     * @returns Self for method chaining
     */
    sourceMetadataDescription(value: string | null | undefined): BaggageBuilder;
    /**
     * Set multiple baggage pairs from a dictionary or iterable.
     * @param pairs Dictionary or iterable of key-value pairs
     * @returns Self for method chaining
     */
    setPairs(pairs: Record<string, any> | Iterable<[string, any]> | null | undefined): BaggageBuilder;
    /**
     * Apply the collected baggage to the current context.
     * @returns A context manager that restores the previous baggage on exit
     */
    build(): BaggageScope;
    /**
     * Add a baggage key/value if the value is not null or whitespace.
     * @param key The baggage key
     * @param value The baggage value
     */
    private set;
    /**
     * Convenience method to begin a request baggage scope with common fields.
     * @param tenantId The tenant ID
     * @param agentId The agent ID
     * @param correlationId The correlation ID
     * @returns A context manager that restores the previous baggage on exit
     */
    static setRequestContext(tenantId?: string | null, agentId?: string | null, correlationId?: string | null): BaggageScope;
}
/**
 * Context manager for baggage scope.
 *
 * This class manages the lifecycle of baggage values, setting them on enter
 * and restoring the previous context on exit.
 */
export declare class BaggageScope implements Disposable {
    private readonly contextWithBaggage;
    constructor(pairs: Map<string, string>);
    /**
     * Execute a synchronous function under this baggage scope.
     * Automatically restores previous context afterward.
     */
    run<T>(fn: () => T): T;
    /**
     * Dispose is a no-op because OpenTelemetry JS automatically restores
     * the previous context after `context.with()` completes.
     */
    [Symbol.dispose](): void;
    /**
     * Manual cleanup alternative if caller isn't using `using`.
     */
    dispose(): void;
}
//# sourceMappingURL=BaggageBuilder.d.ts.map