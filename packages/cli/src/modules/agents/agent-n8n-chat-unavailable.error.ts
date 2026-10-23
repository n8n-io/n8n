import { UserError } from 'n8n-workflow';

export class AgentN8nChatUnavailableError extends UserError {
	constructor() {
		super('This agent is not available in n8n Chat');
	}
}
