import { UnexpectedError, type JsonValue } from '../common';
import type { WorkflowLoop } from '../graph';
import type { LoopReader } from './batch-step';
import { stepKeyId } from './execution.types';
import { classifyEdge, sourceRow } from './iteration-mapping';
import type { StepStore } from './step-store';

/**
 * Creates a reader that performs a batch node's two reads against the step store.
 *
 * A node outside the loop has one pass to read. A node in an earlier loop has
 * many, and only its last one holds that loop's result.
 */
export function createStoreLoopReader(
	stepStore: StepStore,
	executionId: string,
	loops: WorkflowLoop[],
	loop: WorkflowLoop,
	terminalIterations: Map<string, number>,
): LoopReader {
	// TODO(CAT-3982): same-slot convergence gets a defined meaning. We should
	// have rejected this graph at validation time.
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

			const steps = await stepStore.loadStepsByKeys(executionId, [source.key]);
			const step = steps[stepKeyId(source.key)];
			if (!step) {
				throw new UnexpectedError(
					`batch node ${loop.batchNodeId} reads ${entryEdge.from} at iteration ${source.key.iteration}, which has no step`,
				);
			}
			return step.outputs?.[entryEdge.outputIndex] ?? null;
		},

		async readArrivals(iteration) {
			if (!backEdge) return [];
			if (iteration === 0) return [];

			const keys = Array.from({ length: iteration }, (_, index) => ({
				nodeId: backEdge.from,
				iteration: index,
			}));
			const steps = await stepStore.loadStepsByKeys(executionId, keys);

			return keys.map((key): JsonValue => {
				const step = steps[stepKeyId(key)];
				if (!step) {
					throw new UnexpectedError(
						`batch node ${loop.batchNodeId} reads ${backEdge.from} at iteration ${key.iteration}, which has no step`,
					);
				}
				return step.outputs?.[backEdge.outputIndex] ?? null;
			});
		},
	};
}
