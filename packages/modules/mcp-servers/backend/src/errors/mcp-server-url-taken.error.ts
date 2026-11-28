import { ConflictError } from '@n8n/errors';

export class McpServerUrlTakenError extends ConflictError {
	constructor() {
		super('Another MCP server uses this URL. Choose another URL.');
	}
}
