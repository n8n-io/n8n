import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils';
import { jsonParse } from 'n8n-workflow';

import type {
	IntegrationMessageContext,
	IntegrationMessageSubject,
	IntegrationSubjectPerson,
	IntegrationMessageContextStore,
	IntegrationMessageTarget,
} from './integration-tools';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const MESSAGE_CONTEXT_METADATA_KEY = 'currentMessageContext';

@Service()
export class IntegrationMessageContextService implements IntegrationMessageContextStore {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly resourceRepository: AgentResourceRepository,
	) {}

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		const value = this.parseMetadata(thread?.metadata)[MESSAGE_CONTEXT_METADATA_KEY];
		return isIntegrationMessageContext(value) ? value : null;
	}

	async setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: threadId });
		const metadata = {
			...this.parseMetadata(existing?.metadata),
			[MESSAGE_CONTEXT_METADATA_KEY]: context,
		};

		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
			return;
		}

		await this.ensureResource(resourceId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: threadId,
				resourceId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
		);
	}

	private async ensureResource(resourceId: string): Promise<void> {
		const exists = await this.resourceRepository.existsBy({ id: resourceId });
		if (!exists) {
			await this.resourceRepository.save(
				this.resourceRepository.create({ id: resourceId, metadata: null }),
			);
		}
	}

	private parseMetadata(value: string | null | undefined): Record<string, unknown> {
		if (!value) return {};
		try {
			const parsed = jsonParse<unknown>(value);
			return isRecord(parsed) ? parsed : {};
		} catch {
			return {};
		}
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
		(context.agentUserId === undefined || typeof context.agentUserId === 'string') &&
		(context.subject === undefined || isIntegrationMessageSubject(context.subject)) &&
		typeof context.updatedAt === 'string'
	);
}

function isIntegrationMessageSubject(value: unknown): value is IntegrationMessageSubject {
	if (!value || typeof value !== 'object') return false;
	const subject = value as Record<string, unknown>;
	return (
		typeof subject.type === 'string' &&
		typeof subject.id === 'string' &&
		(subject.title === undefined || typeof subject.title === 'string') &&
		(subject.description === undefined || typeof subject.description === 'string') &&
		(subject.url === undefined || typeof subject.url === 'string') &&
		(subject.status === undefined || typeof subject.status === 'string') &&
		(subject.labels === undefined ||
			(Array.isArray(subject.labels) &&
				subject.labels.every((label) => typeof label === 'string'))) &&
		(subject.assignee === undefined || isIntegrationSubjectPerson(subject.assignee)) &&
		(subject.author === undefined || isIntegrationSubjectPerson(subject.author))
	);
}

function isIntegrationSubjectPerson(value: unknown): value is IntegrationSubjectPerson {
	if (!value || typeof value !== 'object') return false;
	const person = value as Record<string, unknown>;
	return typeof person.id === 'string' && typeof person.name === 'string';
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
