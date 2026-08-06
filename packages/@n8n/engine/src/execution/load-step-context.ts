import { UnexpectedError } from '../common';
import type { GraphNode } from '../graph';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepRecord, StepStore } from './step-store';

/**
 * Loads the step and execution for an event, and validates they agree: the
 * step must belong to the event's execution, and its node must exist in the
 * execution's graph.
 *
 * TODO(CAT-3930): internal consistency errors need a story beyond throwing.
 */
export async function loadStepContext(
	executionStore: ExecutionStore,
	stepStore: StepStore,
	event: { executionId: string; stepId: string },
): Promise<{ step: StepRecord; execution: ExecutionRecord; node: GraphNode }> {
	const [step, execution] = await Promise.all([
		stepStore.loadStep(event.stepId),
		executionStore.loadExecution(event.executionId),
	]);

	if (step.executionId !== event.executionId) {
		throw new UnexpectedError(
			`step ${step.id} belongs to execution ${step.executionId}, but the event claims ${event.executionId}`,
		);
	}

	const node = execution.graph.nodes.find((candidate) => candidate.id === step.nodeId);
	if (!node) {
		throw new UnexpectedError(
			`step ${step.id} references node ${step.nodeId}, which is absent from the execution graph`,
		);
	}

	return { step, execution, node };
}
