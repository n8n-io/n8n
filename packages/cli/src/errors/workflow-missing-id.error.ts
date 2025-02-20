import type { Workflow, IWorkflowBase } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

export class WorkflowMissingIdError extends ApplicationError {
	constructor(workflow: Workflow | IWorkflowBase) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
