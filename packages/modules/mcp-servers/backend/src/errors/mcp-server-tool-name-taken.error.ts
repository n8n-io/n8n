import { ConflictError } from '@n8n/errors';

export class McpServerToolNameTakenError extends ConflictError {
	constructor() {
		super('The server already has a tool with this name.');
	}
}
