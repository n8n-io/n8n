import { Service } from '@n8n/di';

import { N8nMemory } from './n8n-memory';
import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
	IntegrationMessageTarget,
} from './integration-tools';

const MESSAGE_CONTEXT_METADATA_KEY = 'currentMessageContext';

@Service()
export class IntegrationMessageContextService implements IntegrationMessageContextStore {
	constructor(private readonly n8nMemory: N8nMemory) {}

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		const thread = await this.n8nMemory.getThread(threadId);
		const value = thread?.metadata?.[MESSAGE_CONTEXT_METADATA_KEY];
		return isIntegrationMessageContext(value) ? value : null;
	}

	async setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void> {
		const existing = await this.n8nMemory.getThread(threadId);
		const metadata = {
			...(existing?.metadata ?? {}),
			[MESSAGE_CONTEXT_METADATA_KEY]: context,
		};

		await this.n8nMemory.saveThread({
			id: threadId,
			resourceId: existing?.resourceId ?? resourceId,
			title: existing?.title,
			metadata,
		});
	}
}

export function isIntegrationMessageContext(value: unknown): value is IntegrationMessageContext {
	if (!value || typeof value !== 'object') return false;
	const context = value as Record<string, unknown>;
	return (
		typeof context.integrationConnectionId === 'string' &&
		typeof context.platform === 'string' &&
		isIntegrationMessageTarget(context.target) &&
		(context.messageId === undefined || typeof context.messageId === 'string') &&
		(context.interactingUserId === undefined || typeof context.interactingUserId === 'string') &&
		typeof context.updatedAt === 'string'
	);
}

function isIntegrationMessageTarget(value: unknown): value is IntegrationMessageTarget {
	if (!value || typeof value !== 'object') return false;
	const target = value as Record<string, unknown>;
	if (target.type === 'thread') {
		return (
			typeof target.threadId === 'string' &&
			(target.channelId === undefined || typeof target.channelId === 'string') &&
			(target.userId === undefined || typeof target.userId === 'string')
		);
	}
	if (target.type === 'channel') {
		return (
			typeof target.channelId === 'string' &&
			(target.threadId === undefined || typeof target.threadId === 'string')
		);
	}
	if (target.type === 'dm') {
		return (
			typeof target.userId === 'string' &&
			(target.threadId === undefined || typeof target.threadId === 'string')
		);
	}
	return false;
}
