import '@n8n/backend-services';

/** Payloads hold only metric values, so only cli touches `prom-client`. */
export interface ExecutionLimitsMetricsEventMap {
	/** The usage held in memory was read again from the database. */
	'execution-limit-usage-refreshed': { durationMs: number };
	'execution-limit-usage-refresh-failed': Record<string, never>;
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLimitsMetricsEventMap {}
}
