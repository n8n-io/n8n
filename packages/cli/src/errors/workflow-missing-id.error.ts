import type { Workflow } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import type { IWorkflowDb } from '@/interfaces';

export class WorkflowMissingIdError extends ApplicationError {
	constructor(workflow: Workflow | IWorkflowDb) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
