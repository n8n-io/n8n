import { EngineError } from './engine-error';
import type { ErrorCategory } from './engine-error';

export class InfrastructureError extends EngineError {
	readonly code = 'INFRASTRUCTURE';
	readonly retriable = false;
	readonly category: ErrorCategory = 'infrastructure';

	constructor(cause: unknown) {
		super(cause instanceof Error ? cause.message : String(cause));
		if (cause instanceof Error) {
			this.stack = cause.stack;
		}
	}
}

export class WorkflowNotFoundError extends EngineError {
	readonly code = 'WORKFLOW_NOT_FOUND';
	readonly retriable = false;
	readonly category: ErrorCategory = 'infrastructure';

	constructor(workflowId: string, version?: number) {
		super(
			version
				? `Workflow ${workflowId} version ${version} not found`
				: `Workflow ${workflowId} not found`,
		);
	}
}

export class StepFunctionNotFoundError extends EngineError {
	readonly code = 'STEP_FUNCTION_NOT_FOUND';
	readonly retriable = false;
	readonly category: ErrorCategory = 'infrastructure';

	constructor(functionRef: string, stepId?: string) {
		super(
			stepId
				? `Step function '${functionRef}' not found for step '${stepId}'`
				: `Step function '${functionRef}' not found`,
		);
	}
}
