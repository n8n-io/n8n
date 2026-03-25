import { RuntimeConfiguration } from '@microsoft/agents-a365-runtime';
import { PerRequestSpanProcessorConfigurationOptions } from './PerRequestSpanProcessorConfigurationOptions';
/**
 * Configuration for PerRequestSpanProcessor.
 * Inherits runtime settings (clusterCategory, isNodeEnvDevelopment) and adds
 * per-request processor guardrails.
 *
 * This is separated from ObservabilityConfiguration because PerRequestSpanProcessor
 * is used only in specific scenarios and these settings should not be exposed
 * in the common ObservabilityConfiguration.
 */
export declare class PerRequestSpanProcessorConfiguration extends RuntimeConfiguration {
    protected get perRequestOverrides(): PerRequestSpanProcessorConfigurationOptions;
    constructor(overrides?: PerRequestSpanProcessorConfigurationOptions);
    get isPerRequestExportEnabled(): boolean;
    get perRequestMaxTraces(): number;
    get perRequestMaxSpansPerTrace(): number;
    get perRequestMaxConcurrentExports(): number;
    get perRequestFlushGraceMs(): number;
    get perRequestMaxTraceAgeMs(): number;
}
//# sourceMappingURL=PerRequestSpanProcessorConfiguration.d.ts.map