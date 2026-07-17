import type { OtelConfig } from '@/modules/otel/otel.config';

/**
 * The OTel settings exposed by the public API: exactly the fields the UI
 * configures. Internal-only bookkeeping such as `envManagedFields` is dropped.
 */
export type OtelSettingsResponse = OtelConfig;

/**
 * Maps the runtime OTel config to the public API response. Explicitly picks the
 * configurable fields so any internal-only field (e.g. `envManagedFields`) is
 * never leaked. Used by both GET and PUT so the two paths never drift.
 */
export function toOtelSettingsResponse(config: OtelConfig): OtelSettingsResponse {
	return {
		enabled: config.enabled,
		exporterEndpoint: config.exporterEndpoint,
		exporterTracingPath: config.exporterTracingPath,
		exporterServiceName: config.exporterServiceName,
		exporterHeaders: config.exporterHeaders,
		tracesSampleRate: config.tracesSampleRate,
		startupConnectivityTimeoutMs: config.startupConnectivityTimeoutMs,
		includeNodeSpans: config.includeNodeSpans,
		injectOutbound: config.injectOutbound,
		productionExecutionsOnly: config.productionExecutionsOnly,
	};
}
