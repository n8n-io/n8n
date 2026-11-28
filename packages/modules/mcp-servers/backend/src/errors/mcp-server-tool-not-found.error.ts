import { NotFoundError } from '@n8n/errors';

export class McpServerToolNotFoundError extends NotFoundError {
	constructor() {
		super('Tool not found');
	}
}
