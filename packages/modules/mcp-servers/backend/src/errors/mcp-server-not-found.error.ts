import { NotFoundError } from '@n8n/errors';

export class McpServerNotFoundError extends NotFoundError {
	constructor() {
		super('MCP server not found');
	}
}
