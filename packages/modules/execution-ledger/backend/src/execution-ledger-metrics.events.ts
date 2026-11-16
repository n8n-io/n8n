import '@n8n/backend-services';

/**
 * Metrics events of the ledger fold. Payloads carry only metric labels and values,
 * so the Prometheus collector in cli stays the only place that touches `prom-client`.
 */
export interface ExecutionLedgerMetricsEventMap {
	/** The fold held the lock and committed. `rows` is 0 when the ledger was empty. */
	'execution-ledger-fold-succeeded': { rows: number };
	/** `attempt` counts the failures in a row on the same batch. */
	'execution-ledger-fold-step-failed': { step: string; attempt: number };
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLedgerMetricsEventMap {}
}
