import { RuntimeConfiguration } from '@microsoft/agents-a365-runtime';
import { ObservabilityConfigurationOptions } from './ObservabilityConfigurationOptions';
/**
 * Configuration for observability package.
 * Inherits runtime settings and adds observability-specific settings.
 */
export declare class ObservabilityConfiguration extends RuntimeConfiguration {
    protected get observabilityOverrides(): ObservabilityConfigurationOptions;
    constructor(overrides?: ObservabilityConfigurationOptions);
    /**
     * Gets the observability authentication scopes.
     * Used by AgenticTokenCache for observability service authentication.
     */
    get observabilityAuthenticationScopes(): readonly string[];
    get isObservabilityExporterEnabled(): boolean;
    get useCustomDomainForObservability(): boolean;
    get observabilityDomainOverride(): string | null;
    get observabilityLogLevel(): string;
}
//# sourceMappingURL=ObservabilityConfiguration.d.ts.map