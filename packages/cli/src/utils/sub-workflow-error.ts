import { isObjectLiteral } from '@n8n/backend-common';
import { OperationalError } from '@n8n/errors';
import { NodeOperationError } from 'n8n-workflow';
import type { JsonObject, Workflow } from 'n8n-workflow';

/**
 * Optional properties that should be propagated from the sub-execution's error to the new Error instance.
 *
 * `violations` keeps a sub-workflow's policy refusal readable in the parent. The
 * `isPolicyRefusal` marker is left out: the parent's own graph was not refused.
 */
const errorProperties = ['description', 'stack', 'executionId', 'workflowId', 'violations'];

/**
 * Builds the error that the parent workflow receives when a sub-execution fails.
 *
 * `error` is the `Error` that the sub-execution threw, or the plain object that a failed
 * run stores in its data. The parent always receives a new error instance.
 */
export function buildSubWorkflowError(
	error: unknown,
	workflow: Workflow,
	subExecution: { executionId: string; workflowId: string },
): Error {
	const source: Record<string, unknown> = { ...readErrorFields(error), ...subExecution };
	if (typeof source.message !== 'string') return new Error('An error occurred');

	const subWorkflowError = createError(source, source.message, workflow);
	for (const field of errorProperties) {
		if (source[field]) Object.assign(subWorkflowError, { [field]: source[field] });
	}
	return subWorkflowError;
}

function readErrorFields(error: unknown): Record<string, unknown> {
	if (typeof error !== 'object' || error === null) return {};
	// An `Error` keeps `message` and `stack` as non-enumerable properties, so a spread skips them.
	return {
		...error,
		message: 'message' in error ? error.message : undefined,
		stack: 'stack' in error ? error.stack : undefined,
	};
}

function createError(source: Record<string, unknown>, message: string, workflow: Workflow): Error {
	const { node, level } = source;
	if (isObjectLiteral(node) && typeof node.name === 'string') {
		const workflowNode = workflow.getNode(node.name);
		if (workflowNode) return new NodeOperationError(workflowNode, source as JsonObject, source);
	}

	if (level === 'warning' || level === 'info') {
		// Not for level `error`: the error reporter sends a `BaseError` subclass without sanitizing its message.
		return new OperationalError(message, { level });
	}

	return new Error(message);
}
