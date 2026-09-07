import { NotFoundError } from '@/errors/response-errors/not-found.error';

/** Thrown when a page's `dataWorkflowId` doesn't resolve to a workflow the acting user can read. */
export class DataWorkflowNotFoundError extends NotFoundError {
	constructor(workflowId: string) {
		super(`Could not find the workflow: '${workflowId}'`);
	}
}
