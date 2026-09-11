import { NotFoundError } from '@/errors/response-errors/not-found.error';

/** Thrown when a binding's `workflowId` doesn't resolve to a workflow the acting user can execute. */
export class BindingWorkflowNotFoundError extends NotFoundError {
	constructor(key: string, workflowId: string) {
		super(`Binding '${key}': could not find the workflow '${workflowId}'.`);
	}
}
