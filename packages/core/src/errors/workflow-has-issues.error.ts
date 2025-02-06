import { WorkflowOperationError } from 'n8n-workflow';

export class WorkflowHasIssuesError extends WorkflowOperationError {
	constructor() {
		super('The workflow has issues and cannot be executed for that reason. Please fix them first.');
	}
}
