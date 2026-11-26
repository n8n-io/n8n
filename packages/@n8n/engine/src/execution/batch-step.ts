import { UnexpectedError, type JsonValue } from '../common';
import type { BatchStepConfig } from '../graph';
import type { ItemSource, StepOutputSources, StepSlots } from './execution.types';
import { DONE_SLOT, LOOP_SLOT } from './loop-ledger';

/** A list another step emitted, with the slot it came from. */
export interface SourcedList {
	items: JsonValue;
	from: Pick<ItemSource, 'nodeId' | 'outputIndex' | 'iteration'>;
}

/**
 * The two database reads a batch node needs.
 *
 * Every other step type is handed everything it needs. A batch node is handed
 * only the pass before's output, so it fetches the rest itself. Each read says
 * which step's slot it read, so the batch node can state where its items come from.
 */
export interface LoopReader {
	/** The list the loop is working through, as it arrived from outside the loop. */
	readOriginalItems(): Promise<SourcedList | null>;
	/** What the loop body returned on each pass before this one, oldest first. */
	readArrivals(iteration: number): Promise<SourcedList[]>;
}

/** What a batch pass emits: its outputs, and where every item in them came from. */
export interface BatchStepResult {
	outputs: StepSlots;
	outputSources: StepOutputSources;
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
): Promise<BatchStepResult> {
	const original = await reader.readOriginalItems();
	const originalItems = asList(original?.items ?? null, 'the batch node input');
	const start = iteration * config.batchSize;
	const slice = originalItems.slice(start, start + config.batchSize);

	if (slice.length > 0 && original) {
		return slot(LOOP_SLOT, slice, [{ ...original.from, offset: start, itemCount: slice.length }]);
	}

	const arrivals = await reader.readArrivals(iteration);
	const accumulated: JsonValue[] = [];
	const sources: ItemSource[] = [];
	arrivals.forEach((arrival, index) => {
		const items = asList(arrival.items, `arrival ${index} of the batch node`);
		if (items.length === 0) return;
		accumulated.push(...items);
		sources.push({ ...arrival.from, offset: 0, itemCount: items.length });
	});

	if (accumulated.length === 0) return { outputs: [null, null], outputSources: [null, null] };

	return slot(DONE_SLOT, accumulated, sources);
}

function slot(filled: number, value: JsonValue[], sources: ItemSource[]): BatchStepResult {
	return filled === DONE_SLOT
		? { outputs: [value, null], outputSources: [sources, null] }
		: { outputs: [null, value], outputSources: [null, sources] };
}

function asList(value: JsonValue, displayName: string): JsonValue[] {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value;
	throw new UnexpectedError(`${displayName} holds ${typeof value}, and a batch node slices a list`);
}
