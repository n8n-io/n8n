import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { ClusterCategory, IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { ObservabilityConfiguration, PerRequestSpanProcessorConfiguration } from '../../configuration';
/**
 * Convert trace ID to hex string format
 */
export declare function hexTraceId(value: string | number): string;
/**
 * Convert span ID to hex string format
 */
export declare function hexSpanId(value: string | number): string;
/**
 * Convert any value to string, handling null/undefined
 */
export declare function asStr(v: unknown): string | undefined;
/**
 * Get span kind name from SpanKind enum
 */
export declare function kindName(kind: SpanKind): string;
/**
 * Get status name from SpanStatusCode enum
 */
export declare function statusName(code: SpanStatusCode): string;
/**
 * Partition spans by (tenantId, agentId) identity pairs
 */
export declare function partitionByIdentity(spans: ReadableSpan[]): Map<string, ReadableSpan[]>;
/**
 * Check if Agent 365 exporter is enabled via environment variable
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
export declare function isAgent365ExporterEnabled(configProvider?: IConfigurationProvider<ObservabilityConfiguration>): boolean;
/**
 * Check if per-request export is enabled.
 * Precedence: internal overrides > configuration provider > environment variable.
 * When enabled, the PerRequestSpanProcessor is used instead of BatchSpanProcessor.
 * The token is passed via OTel Context (async local storage) at export time.
 * @param configProvider Optional configuration provider. Defaults to defaultPerRequestSpanProcessorConfigurationProvider if not specified.
 */
export declare function isPerRequestExportEnabled(configProvider?: IConfigurationProvider<PerRequestSpanProcessorConfiguration>): boolean;
/**
 * Single toggle to use custom domain for observability export.
 * When true exporter will send traces to custom Agent365 service endpoint
 * and include x-ms-tenant-id in headers.
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
export declare function useCustomDomainForObservability(configProvider?: IConfigurationProvider<ObservabilityConfiguration>): boolean;
/**
 * Resolve the Agent365 service endpoint base URI for a given cluster category.
 * When an explicit override is not configured, this determines the default base URI.
 */
export declare function resolveAgent365Endpoint(clusterCategory: ClusterCategory): string;
/**
 * Get Agent365 Observability domain override.
 * Internal development and test clusters can override this by setting the
 * `A365_OBSERVABILITY_DOMAIN_OVERRIDE` environment variable. When set to a
 * non-empty value, that value is used as the base URI regardless of cluster category. Otherwise, null is returned.
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
export declare function getAgent365ObservabilityDomainOverride(configProvider?: IConfigurationProvider<ObservabilityConfiguration>): string | null;
/**
 * Parse identity key back to tenant and agent IDs
 */
export declare function parseIdentityKey(key: string): {
    tenantId: string;
    agentId: string;
};
//# sourceMappingURL=utils.d.ts.map