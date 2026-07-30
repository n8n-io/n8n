import type { OtelConfig } from '@/modules/otel/otel.config';

export type OtelSettingsResponse = OtelConfig;

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
