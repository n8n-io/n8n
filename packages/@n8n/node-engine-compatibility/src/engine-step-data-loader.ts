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

		const nodeIds = execution.graph.nodes.map((node) => node.id);
		const stored = await stepStore.loadStepOutputs(context.executionId, nodeIds);

		const outputsByNodeId: Record<string, StepSlots> = {};
		for (const [nodeId, outputs] of Object.entries(stored)) {
			if (outputs !== null) outputsByNodeId[nodeId] = outputs;
		}

		return { graph: execution.graph, outputsByNodeId };
	};
}
