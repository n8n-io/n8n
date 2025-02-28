import type { Workflow, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

export class WorkflowMissingIdError extends UnexpectedError {
	constructor(workflow: Workflow | IWorkflowBase) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
