import type { TerminalTaskStatus } from '@n8n/constants';

export interface RetentionBatch {
	/** Terminal statuses this batch may delete. */
	statuses: TerminalTaskStatus[];
	/** Minimum age: only rows finished at least this long before DB-now go. */
	olderThanMs: number;
	/** Cap on how many rows this one statement deletes. Non-positive is a no-op. */
	limit: number;
}

export interface RetentionStore {
	/**
	 * Delete up to `limit` tasks in `statuses` whose `finishedAt` is at least older than `olderThanMs`.
	 * Oldest first.
	 *
	 * @returns how many rows were deleted
	 */
	deleteFinishedOlderThan(batch: RetentionBatch): Promise<number>;
}
