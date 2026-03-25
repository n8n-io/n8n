import { RuntimeConfigurationOptions } from '@microsoft/agents-a365-runtime';
/**
 * Observability configuration options - extends runtime options.
 * All overrides are functions called on each property access.
 *
 * Inherited from RuntimeConfigurationOptions:
 * - clusterCategory
 * - isNodeEnvDevelopment
 *
 * Note: `isDevelopmentEnvironment` is a derived getter on the configuration class
 * (based on clusterCategory), not an overridable option.
 */
export type ObservabilityConfigurationOptions = RuntimeConfigurationOptions & {
    /**
     * Override for observability authentication scopes.
     * Used by AgenticTokenCache for observability service authentication.
     *
     * @returns Array of OAuth scopes for observability service authentication.
     * @envvar A365_OBSERVABILITY_SCOPES_OVERRIDE - Space-separated list of scopes.
     * @default ['https://api.powerplatform.com/.default']
     */
    observabilityAuthenticationScopes?: () => string[];
    /**
     * Override to enable/disable the Agent365 observability span exporter.
     * When enabled, spans are exported to the Agent365 observability service.
     *
     * @returns `true` to enable the exporter, `false` to disable.
     * @envvar ENABLE_A365_OBSERVABILITY_EXPORTER - 'true', '1', 'yes', 'on' to enable.
     * @default false
     */
    isObservabilityExporterEnabled?: () => boolean;
    /**
     * Override to enable/disable custom domain for observability endpoints.
     * When enabled, uses `observabilityDomainOverride` instead of the default endpoint.
     *
     * @returns `true` to use custom domain, `false` to use default.
     * @envvar A365_OBSERVABILITY_USE_CUSTOM_DOMAIN - 'true', '1', 'yes', 'on' to enable.
     * @default false
     */
    useCustomDomainForObservability?: () => boolean;
    /**
     * Override for the custom observability domain/endpoint.
     * Only used when `useCustomDomainForObservability` is true.
     * Trailing slashes are automatically removed.
     *
     * @returns Custom domain URL string, or `null` for no override.
     * @envvar A365_OBSERVABILITY_DOMAIN_OVERRIDE - Full URL of custom endpoint.
     * @default null
     */
    observabilityDomainOverride?: () => string | null;
    /**
     * Override for the internal SDK log level.
     * Controls which log messages are output by the observability SDK's internal logger.
     *
     * Supported values (pipe-separated for multiple):
     * - 'none' - No logging (default)
     * - 'info' - Information messages
     * - 'warn' - Warning messages
     * - 'error' - Error messages
     * - 'info|warn|error' - All messages
     *
     * @returns Log level string.
     * @envvar A365_OBSERVABILITY_LOG_LEVEL
     * @default 'none'
     */
    observabilityLogLevel?: () => string;
};
//# sourceMappingURL=ObservabilityConfigurationOptions.d.ts.map