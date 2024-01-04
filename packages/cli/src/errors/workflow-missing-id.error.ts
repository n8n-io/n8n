import type { IWorkflowDb } from '@/Interfaces';
import type { Workflow } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

export class WorkflowMissingIdError extends ApplicationError {
	constructor(workflow: Workflow | IWorkflowDb) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
