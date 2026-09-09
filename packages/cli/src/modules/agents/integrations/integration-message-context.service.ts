import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import type {
	IntegrationMessageContext,
	IntegrationMessageSubject,
	IntegrationSubjectPerson,
	IntegrationMessageContextStore,
	IntegrationMessageTarget,
	SessionBinding,
} from './integration-tools';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const MESSAGE_CONTEXT_METADATA_KEY = 'currentMessageContext';
const CONTINUE_AS_METADATA_KEY = 'continueAs';
const BOUND_THREADS_METADATA_KEY = 'boundThreads';

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
		await this.writeMetadata(threadId, resourceId, {
			[MESSAGE_CONTEXT_METADATA_KEY]: context,
		});
	}

	async bindSession(derivedThreadId: string, origin: SessionBinding): Promise<void> {
		if (derivedThreadId === origin.threadId) return;
		if (await this.resolveSession(derivedThreadId)) return;

		await this.appendBoundThread(origin.threadId, derivedThreadId);
		await this.writeContinueAsIfAbsent(derivedThreadId, origin);
	}

	async resolveSession(derivedThreadId: string): Promise<SessionBinding | null> {
		const thread = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const value = this.parseMetadata(thread?.metadata)[CONTINUE_AS_METADATA_KEY];
		return isSessionBinding(value) ? value : null;
	}

	async unbindSession(derivedThreadId: string): Promise<void> {
		await this.writeMetadata(derivedThreadId, undefined, {
			[CONTINUE_AS_METADATA_KEY]: undefined,
		});
	}

	async clearSessionBindings(originThreadId: string): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: originThreadId });
		const metadata = this.parseMetadata(existing?.metadata);
		const bound = Array.isArray(metadata[BOUND_THREADS_METADATA_KEY])
			? (metadata[BOUND_THREADS_METADATA_KEY] as string[])
			: [];
		if (bound.length === 0) return;
		for (const id of bound) await this.unbindSession(id);
		metadata[BOUND_THREADS_METADATA_KEY] = [];
		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
		}
	}

	private async writeContinueAsIfAbsent(
		derivedThreadId: string,
		origin: SessionBinding,
	): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const metadata = this.parseMetadata(existing?.metadata);
		if (isSessionBinding(metadata[CONTINUE_AS_METADATA_KEY])) return;
		metadata[CONTINUE_AS_METADATA_KEY] = origin;
		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
			return;
		}
		await this.ensureResource(origin.resourceId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: derivedThreadId,
				resourceId: origin.resourceId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
		);
	}

	private async appendBoundThread(originThreadId: string, derivedThreadId: string): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: originThreadId });
		const metadata = this.parseMetadata(existing?.metadata);
		const bound = Array.isArray(metadata[BOUND_THREADS_METADATA_KEY])
			? (metadata[BOUND_THREADS_METADATA_KEY] as string[]).filter((id) => id !== derivedThreadId)
			: [];
		bound.push(derivedThreadId);
		metadata[BOUND_THREADS_METADATA_KEY] = bound;
		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
			return;
		}
		await this.ensureResource(originThreadId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: originThreadId,
				resourceId: originThreadId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
		);
	}

	private async writeMetadata(
		threadId: string,
		resourceId: string | undefined,
		patch: Record<string, unknown>,
	): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: threadId });
		const metadata = {
			...this.parseMetadata(existing?.metadata),
			...patch,
		};

		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
			return;
		}

		await this.ensureResource(resourceId ?? threadId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: threadId,
				resourceId: resourceId ?? threadId,
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

function isSessionBinding(value: unknown): value is SessionBinding {
	return (
		isRecord(value) && typeof value.threadId === 'string' && typeof value.resourceId === 'string'
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
