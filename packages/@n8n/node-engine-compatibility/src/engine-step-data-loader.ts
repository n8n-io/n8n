import type { ExecutionStore, StepSlots, StepStore } from '@n8n/engine';

import type { StepData, StepDataLoader } from './types';
import { runIndexOf, toRunLayout } from './v1-run-data';

/**
 * Loads what an expression might name: the graph, and every completed step's
 * output at every run.
 *
 * A step that has not completed is left out, so naming it fails with the usual
 * "hasn't been executed" error. It still counts towards the run layout, so the
 * runs after it keep their v1 run index.
 *
 * TODO(CAT-3017): load only what the step's expressions reference. Loops make
 * this worse, since the number of steps now grows with the data processed.
 */
export function createEngineStepDataLoader(
	executionStore: ExecutionStore,
	stepStore: StepStore,
): StepDataLoader {
	return async (context): Promise<StepData> => {
		const execution = await executionStore.loadExecution(context.executionId);
		const steps = await stepStore.loadAllSteps(context.executionId);
		const layout = toRunLayout(steps);

		const byNode = new Map<string, Record<number, StepSlots>>();
		for (const step of steps) {
			if (step.status !== 'completed' || step.outputs === null) continue;
			let byRun = byNode.get(step.nodeId);
			if (byRun === undefined) {
				byRun = {};
				byNode.set(step.nodeId, byRun);
			}
			byRun[runIndexOf(layout, step)] = step.outputs;
		}

		return { graph: execution.graph, outputsByNode: Object.fromEntries(byNode), layout };
	};
}
