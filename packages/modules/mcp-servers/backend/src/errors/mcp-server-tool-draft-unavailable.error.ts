import { ServiceUnavailableError } from '@n8n/errors';

export class McpServerToolDraftUnavailableError extends ServiceUnavailableError {
	constructor(message = 'The n8n Assistant could not write a draft. Try again.') {
		super(message);
	}
}
