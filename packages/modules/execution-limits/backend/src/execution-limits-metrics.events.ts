import '@n8n/backend-services';

/** Payloads hold only metric values, so only cli touches `prom-client`. */
export interface ExecutionLimitsMetricsEventMap {
	/** A refresh succeeded. `queried` is `false` when no scope has a limit, so nothing was read. */
	'execution-limit-usage-refreshed': { durationMs: number; queried: boolean };
	'execution-limit-usage-refresh-failed': Record<string, never>;
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLimitsMetricsEventMap {}
}
