import { Time } from '@n8n/constants';

/**
 * Knobs of an owner reconciliation pass.
 * The trade-offs are documented on `reconcile`.
 */
export interface ReconciliationOptions {
	/** Minimum age of a job before a pass considers it, in seconds. */
	settleSeconds: number;

	/** How long a quarantined job is kept before deletion, in seconds. */
	quarantineGraceSeconds: number;

	/** How many owners one page of the keyset walk covers. */
	batchSize: number;

	/**
	 * The most owner pages one pass reads, across all owner types, bounding the
	 * pass; a backlog beyond it drains over successive passes.
	 */
	maxPagesPerPass: number;

	/** Resolves a row that stored no timezone when a revival recomputes its clock. */
	defaultTimezone: string;
}

export const DEFAULT_RECONCILIATION_OPTIONS: ReconciliationOptions = {
	settleSeconds: 5 * Time.minutes.toSeconds,
	quarantineGraceSeconds: Time.days.toSeconds,
	batchSize: 500,
	maxPagesPerPass: 1000,
	defaultTimezone: 'UTC',
};
