import { ConflictError } from '@n8n/errors';

export class McpServerWorkflowToolTakenError extends ConflictError {
	constructor(readonly workflowId: string) {
		super(`The server already has the workflow "${workflowId}" as a tool.`);
	}
}
