import { OperationalError } from 'n8n-workflow';

export const CONVERSATION_LEASE_TTL_MS = 120_000;
export const CONVERSATION_LEASE_RENEW_MS = 30_000;

export type AgentConversationLeaseHandle = Readonly<{
	agentId: string;
	threadId: string;
	ownerToken: string;
}>;

export class AgentConversationLeaseLostError extends OperationalError {
	constructor(threadId: string) {
		super('Agent conversation ownership has ended', { extra: { threadId } });
	}
}

export class AgentConversationLeaseTimeoutError extends OperationalError {
	constructor(threadId: string) {
		super('Agent conversation is busy', { extra: { threadId } });
	}
}
