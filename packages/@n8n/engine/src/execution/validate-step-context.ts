import { UnexpectedError } from '../common';
import type { GraphNode } from '../graph';
import type { ExecutionRecord } from './execution-store';
import type { StepRecord } from './step-store';

/**
 * Validates that a step and an execution agree — the step must belong to the
 * execution, and its node must exist in the execution's graph — and returns
 * that node.
 *
 * TODO(CAT-3930): internal consistency errors need a story beyond throwing.
 */
export function validateStepContext(step: StepRecord, execution: ExecutionRecord): GraphNode {
	if (step.executionId !== execution.id) {
		throw new UnexpectedError(
			`step ${step.id} belongs to execution ${step.executionId}, but the event claims ${execution.id}`,
		);
	}

	const node = execution.graph.nodes.find((candidate) => candidate.id === step.nodeId);
	if (!node) {
		throw new UnexpectedError(
			`step ${step.id} references node ${step.nodeId}, which is absent from the execution graph`,
		);
	}

	return node;
}
