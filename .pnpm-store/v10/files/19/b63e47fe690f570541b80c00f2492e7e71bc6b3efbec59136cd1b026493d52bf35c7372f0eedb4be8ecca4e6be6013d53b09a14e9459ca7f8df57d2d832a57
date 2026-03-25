import { ObservabilityBuilder, BuilderOptions } from './ObservabilityBuilder';
/**
 * Main entry point for Agent 365 providing OpenTelemetry tracing for AI agents and tools
 */
export declare class ObservabilityManager {
    private static instance?;
    /**
     * Configures Agent 365 with OpenTelemetry tracing for AI agents and tools
     * @param configure Optional configuration callback for the Builder
     * @returns The configured Builder instance
     */
    static configure(configure?: (builder: ObservabilityBuilder) => void): ObservabilityBuilder;
    /**
     * Configures and starts Agent 365 with simplified options
     * @param options Configuration options
     * @returns The configured and started Builder instance
     */
    static start(options?: BuilderOptions): ObservabilityBuilder;
    /**
     * Gets the current Agent 365 instance
     * @returns The current instance or null if not configured
     */
    static getInstance(): ObservabilityBuilder | null;
    /**
     * Shuts down Agent 365
     */
    static shutdown(): Promise<void>;
}
//# sourceMappingURL=ObservabilityManager.d.ts.map