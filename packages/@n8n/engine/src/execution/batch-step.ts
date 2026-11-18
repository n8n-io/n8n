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

export interface BatchStepResult {
	outputs: StepSlots;
	/** How many data passes the loop has. Only a parallel loop records it, for admission. */
	loopPassCount?: number;
}

/**
 * Hands the loop body its next few items, or ends the loop once they run out.
 *
 * A pass derives its share from its own number, so it never counts what earlier
 * passes did and so re-running one is safe. The same holds in a parallel loop,
 * where passes run in any order: the terminal pass still reads what each pass
 * returned in pass order.
 */
export async function runBatchStep(
	config: BatchStepConfig,
	iteration: number,
	reader: LoopReader,
): Promise<BatchStepResult> {
	const originalItems = asList(await reader.readOriginalItems(), 'the batch node input');
	const start = iteration * config.batchSize;
	const slice = originalItems.slice(start, start + config.batchSize);
	const extras = config.parallel
		? { loopPassCount: Math.ceil(originalItems.length / config.batchSize) }
		: {};

	if (slice.length > 0) return { outputs: slot(LOOP_SLOT, slice), ...extras };

	const arrivals = await reader.readArrivals(iteration);
	const accumulated = arrivals.flatMap((arrival, index) =>
		asList(arrival, `arrival ${index} of the batch node`),
	);

	if (accumulated.length === 0) return { outputs: [null, null], ...extras };

	return { outputs: slot(DONE_SLOT, accumulated), ...extras };
}

function slot(filled: number, value: JsonValue[]): StepSlots {
	return filled === DONE_SLOT ? [value, null] : [null, value];
}

function asList(value: JsonValue, displayName: string): JsonValue[] {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value;
	throw new UnexpectedError(`${displayName} holds ${typeof value}, and a batch node slices a list`);
}
