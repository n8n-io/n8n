import { UnexpectedError, type JsonValue } from '../common';
import type { BatchStepConfig } from '../graph';
import type { StepSlots } from './execution.types';
import { DONE_SLOT, LOOP_SLOT } from './loop-ledger';

/**
 * The two database reads a batch node needs.
 *
 * Every other step type is handed everything it needs. A batch node is handed
 * only the pass before's output, so it fetches the rest itself.
 */
export interface LoopReader {
	/** The list the loop is working through, as it arrived from outside the loop. */
	readOriginalItems(): Promise<JsonValue>;
	/** What the loop body returned on each pass before this one, oldest first. */
	readArrivals(iteration: number): Promise<JsonValue[]>;
}

/**
 * Hands the loop body its next few items, or ends the loop once they run out.
 *
 * A pass derives its share from its own number, so it never counts what earlier
 * passes did and so re-running one is safe.
 */
export async function runBatchStep(
	config: BatchStepConfig,
	iteration: number,
	reader: LoopReader,
): Promise<StepSlots> {
	const originalItems = asList(await reader.readOriginalItems(), 'the batch node input');
	const start = iteration * config.batchSize;
	const slice = originalItems.slice(start, start + config.batchSize);

	if (slice.length > 0) return slot(LOOP_SLOT, slice);

	const arrivals = await reader.readArrivals(iteration);
	const accumulated = arrivals.flatMap((arrival, index) =>
		asList(arrival, `arrival ${index} of the batch node`),
	);

	if (accumulated.length === 0) return [null, null];

	return slot(DONE_SLOT, accumulated);
}

function slot(filled: number, value: JsonValue[]): StepSlots {
	return filled === DONE_SLOT ? [value, null] : [null, value];
}

function asList(value: JsonValue, displayName: string): JsonValue[] {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value;
	throw new UnexpectedError(`${displayName} holds ${typeof value}, and a batch node slices a list`);
}
