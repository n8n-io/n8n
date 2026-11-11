import { UnexpectedError, type JsonValue } from '../common';
import type { GraphEdge, WorkflowLoop } from '../graph';
import type { LoopReader } from './batch-step';
import { nodePassId, type NodePass } from './execution.types';
import { classifyEdge, sourceRow } from './iteration-mapping';
import type { StepRecord, StepStore } from './step-store';

/**
 * Creates a reader that performs a batch node's two reads against the step store.
 *
 * A node outside the loop has one pass to read. A node in an earlier loop has
 * many, and only its last one holds that loop's result.
 *
 * A pass can hold several runs of the node it reads, when something upstream
 * converged. The reader concatenates them, in run order, so a loop processes
 * everything that arrives and never forks.
 */
export function createStoreLoopReader(
	stepStore: StepStore,
	executionId: string,
	loops: WorkflowLoop[],
	loop: WorkflowLoop,
	terminalIterations: Map<string, number>,
): LoopReader {
	// TODO(CAT-3982): converging edges into a batch node could concatenate too.
	if (loop.entryEdges.length > 1 || loop.backEdges.length > 1) {
		throw new UnexpectedError(
			`batch node ${loop.batchNodeId} has ${loop.entryEdges.length} entry edges and ${loop.backEdges.length} back-edges; validated loops have at most one of each`,
		);
	}

	const [entryEdge] = loop.entryEdges;
	const [backEdge] = loop.backEdges;

	return {
		async readOriginalItems() {
			if (!entryEdge) return null;

			const source = sourceRow(
				entryEdge,
				classifyEdge(entryEdge, loops),
				{ nodeId: loop.batchNodeId, iteration: 0 },
				terminalIterations.get(entryEdge.from),
			);
			if (source.kind !== 'row') {
				throw new UnexpectedError(
					`batch node ${loop.batchNodeId} reads ${entryEdge.from}, which has no step to read`,
				);
			}

			const passes = await stepStore.loadStepsByPasses(executionId, [source.key]);
			return concatenateRuns(loop, entryEdge, source.key, passes[nodePassId(source.key)]);
		},

		async readArrivals(iteration) {
			if (!backEdge) return [];
			if (iteration === 0) return [];

			const keys = Array.from({ length: iteration }, (_, index) => ({
				nodeId: backEdge.from,
				iteration: index,
			}));
			const passes = await stepStore.loadStepsByPasses(executionId, keys);

			return keys.map((key) => concatenateRuns(loop, backEdge, key, passes[nodePassId(key)]));
		},
	};
}

/**
 * Every run's output on the edge's slot, as one list. `null` when no run filled
 * it, as a single run that left the slot empty reads today.
 */
function concatenateRuns(
	loop: WorkflowLoop,
	edge: GraphEdge,
	pass: NodePass,
	runs: StepRecord[] | undefined,
): JsonValue {
	if (!runs || runs.length === 0) {
		throw new UnexpectedError(
			`batch node ${loop.batchNodeId} reads ${edge.from} at iteration ${pass.iteration}, which has no step`,
		);
	}

	const filled = runs
		.map((run) => run.outputs?.[edge.outputIndex] ?? null)
		.filter((value) => value !== null);
	if (filled.length === 0) return null;
	if (filled.length === 1) return filled[0];

	return filled.flatMap((value) => {
		if (Array.isArray(value)) return value;
		throw new UnexpectedError(
			`batch node ${loop.batchNodeId} reads ${edge.from}, whose output holds ${typeof value}, and a batch node concatenates lists`,
		);
	});
}
