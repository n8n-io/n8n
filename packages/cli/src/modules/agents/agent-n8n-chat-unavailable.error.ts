import { UserError } from '@n8n/errors';

export class AgentN8nChatUnavailableError extends UserError {
	constructor() {
		super('This agent is not available in n8n Chat');
	}
}
