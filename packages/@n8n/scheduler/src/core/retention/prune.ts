import { ScheduledTaskStatus, type TerminalTaskStatus, Time } from '@n8n/constants';

import { InvalidRetentionOptionsError } from '../errors';
import { DEFAULT_RETENTION_OPTIONS, type RetentionOptions } from './options';
import type { RetentionStore } from './store';

export interface RetentionSummary {
	/** How many finished tasks this pass deleted. */
	deleted: number;

	/**
	 * Whether everything past its window went.
	 * `false` means the pass spent its batch budget first.
	 * The next pass continues where this one stopped.
	 */
	drained: boolean;
}

interface RetentionWindow {
	statuses: TerminalTaskStatus[];
	olderThanSeconds: number;
}

function retentionWindows(options: RetentionOptions): RetentionWindow[] {
	return [
		{
			statuses: [ScheduledTaskStatus.Succeeded, ScheduledTaskStatus.Cancelled],
			olderThanSeconds: options.retentionSeconds,
		},
		{
			statuses: [ScheduledTaskStatus.Failed, ScheduledTaskStatus.Missed],
			olderThanSeconds: options.failedRetentionSeconds,
		},
	];
}

/**
 * One retention pass of the scheduler: delete terminal tasks past their
 * retention window, oldest first, in bounded batches.
 *
 * Each batch is one bounded statement, deliberately not wrapped in an
 * enclosing transaction: batches don't need atomicity with each other (a
 * terminal row never becomes live again, so whatever a partial pass leaves
 * behind is simply picked up later), and small statements keep locks short.
 *
 * A pass issues at most `maxBatchesPerPass` statements,
 * so a large backlog drains across successive passes instead of monopolising one.
 *
 * Each window ahead keeps one statement of that budget in reserve, so a backlog saturating an
 * early window cannot starve a later one out of the pass entirely.
 *
 * Cancellation (`signal`, aborted when the driving loop times the pass out or
 * shuts down) is batch-granular, because each batch is its own committed
 * statement: the pass issues no further batches, keeps what it already
 * deleted, and reports itself not drained — the next pass continues where it
 * stopped, exactly like a spent budget.
 */
export async function prune(
	store: RetentionStore,
	options: RetentionOptions = DEFAULT_RETENTION_OPTIONS,
	signal?: AbortSignal,
): Promise<RetentionSummary> {
	if (!Number.isInteger(options.batchSize) || options.batchSize <= 0) {
		throw new InvalidRetentionOptionsError(
			`batchSize must be a positive integer, got ${options.batchSize}`,
		);
	}

	// Only the summary leaves; the budget is pass-internal bookkeeping.
	const { deleted, drained } = await pruneWindows(
		store,
		retentionWindows(options),
		options,
		{
			deleted: 0,
			budget: options.maxBatchesPerPass,
			drained: true,
		},
		signal,
	);
	return { deleted, drained };
}

interface PassState {
	deleted: number;
	budget: number;
	drained: boolean;
}

async function pruneWindows(
	store: RetentionStore,
	windows: RetentionWindow[],
	options: RetentionOptions,
	state: PassState,
	signal?: AbortSignal,
): Promise<PassState> {
	const [window, ...rest] = windows;
	if (window === undefined) {
		return state;
	}

	const windowBudget = state.budget <= 0 ? 0 : Math.max(state.budget - rest.length, 1);
	const pruned = await pruneWindow(store, window, options.batchSize, windowBudget, signal);
	return await pruneWindows(
		store,
		rest,
		options,
		{
			deleted: state.deleted + pruned.deleted,
			budget: state.budget - pruned.batches,
			drained: state.drained && pruned.drained,
		},
		signal,
	);
}

async function pruneWindow(
	store: RetentionStore,
	window: RetentionWindow,
	batchSize: number,
	budget: number,
	signal?: AbortSignal,
): Promise<{ deleted: number; batches: number; drained: boolean }> {
	let deleted = 0;
	let batches = 0;

	while (batches < budget) {
		if (signal?.aborted === true) {
			return { deleted, batches, drained: false };
		}
		const affected = await store.deleteFinishedOlderThan({
			statuses: window.statuses,
			olderThanMs: window.olderThanSeconds * Time.seconds.toMilliseconds,
			limit: batchSize,
		});
		batches += 1;
		deleted += affected;
		if (affected < batchSize) {
			return { deleted, batches, drained: true };
		}
	}

	return { deleted, batches, drained: false };
}
