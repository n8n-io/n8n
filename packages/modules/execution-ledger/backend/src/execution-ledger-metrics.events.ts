import '@n8n/backend-services';

/** Payloads hold only metric labels and values, so only cli touches `prom-client`. */
export interface ExecutionLedgerMetricsEventMap {
	/** The fold held the lock and committed, also when the ledger was empty. */
	'execution-ledger-fold-succeeded': {};
	'execution-ledger-fold-step-failed': { step: string };
}

declare module '@n8n/backend-services' {
	interface EventMap extends ExecutionLedgerMetricsEventMap {}
}
