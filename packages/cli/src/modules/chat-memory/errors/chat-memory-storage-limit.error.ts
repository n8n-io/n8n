import { UserError } from 'n8n-workflow';

export class ChatMemoryStorageLimitError extends UserError {
	constructor(msg: string) {
		super(msg, { level: 'warning' });
	}
}
