import type {} from '@n8n/backend-services';

/** A budget counter that crossed a warning threshold, or the limit of a `warn` budget. */
export interface LlmBudgetWarningEvent {
	budgetId: string;
	budgetName: string;
	/** The values of the counter, for example `user=<id>&credential=<id>`. */
	counterKey: string;
	thresholdPercent: number;
	percent: number;
	spentUsd: number;
	limitUsd: number;
}

export interface LlmBudgetEventMap {
	'llm-budget-threshold-reached': LlmBudgetWarningEvent;
	'llm-budget-limit-reached': LlmBudgetWarningEvent;
}

// cli relays these events to log streaming. It lists them in its own `RelayEventMap` too.
declare module '@n8n/backend-services' {
	interface EventMap extends LlmBudgetEventMap {}
}
