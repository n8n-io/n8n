import type { ExecutionStore, StepSlots, StepStore } from '@n8n/engine';

import type { StepData, StepDataLoader } from './types';

/**
 * A `StepDataLoader` backed by the engine's own stores: the graph off the
 * execution row, the outputs of every completed step off the step rows.
 * Loads everything. TODO(CAT-3017): load selectively, based on what the
 * step's expressions actually reference.
 *
 * Steps that haven't completed are omitted rather than mapped to null, so
 * expressions referencing them fail with the standard "hasn't been executed"
 * error.
 */
export function createEngineStepDataLoader(
	executionStore: ExecutionStore,
	stepStore: StepStore,
): StepDataLoader {
	return async (context): Promise<StepData> => {
		const execution = await executionStore.loadExecution(context.executionId);

		// TODO(CAT-2875): Expressions inside loop bodies resolve run-indexed.
		// iteration 0 is every row there is until the engine executes loops.
		const keys = execution.graph.nodes.map((node) => ({ nodeId: node.id, iteration: 0 }));
		const stored = await stepStore.loadStepsByKeys(context.executionId, keys);

		const outputsByNodeId: Record<string, StepSlots> = {};
		for (const row of Object.values(stored)) {
			if (row.status === 'completed' && row.outputs !== null)
				outputsByNodeId[row.nodeId] = row.outputs;
		}

		return { graph: execution.graph, outputsByNodeId };
	};
}
