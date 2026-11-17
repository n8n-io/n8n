import '@n8n/backend-services';

/** Payloads hold only metric labels and values, so only cli touches `prom-client`. */
export interface ExecutionLedgerMetricsEventMap {
	/** The fold held the lock and committed. `rows` is 0 when the ledger was empty. */
	'execution-ledger-fold-succeeded': { rows: number };
	'execution-ledger-fold-step-failed': { step: string };
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLedgerMetricsEventMap {}
}
