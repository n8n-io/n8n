import type { ToolContext } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
	SessionBinding,
	SessionReplyScope,
} from './integration-tool-types';
import {
	isIntegrationMessageContext,
	readIntegrationMessageContext,
} from './integration-message-context';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const MESSAGE_CONTEXT_METADATA_KEY = 'currentMessageContext';
const CONTINUE_AS_METADATA_KEY = 'continueAs';
const BOUND_THREADS_METADATA_KEY = 'boundThreads';
const OUTBOUND_METADATA_KEY = 'outboundMessages';
const MAX_OUTBOUND_MESSAGES = 5;
const MAX_OUTBOUND_TEXT_LENGTH = 2000;
const SENT_MESSAGES_METADATA_KEY = 'sentMessages';

/** Older entries drop out, so the metadata of a busy thread stays small. */
const MAX_SENT_MESSAGES_PER_THREAD = 50;

@Service()
export class IntegrationMessageContextService implements IntegrationMessageContextStore {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly resourceRepository: AgentResourceRepository,
		private readonly logger: Logger,
	) {}

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		const value = this.parseMetadata(thread?.metadata)[MESSAGE_CONTEXT_METADATA_KEY];
		return isIntegrationMessageContext(value) ? value : null;
	}

	async getForResume(
		persistence: NonNullable<ToolContext['persistence']>,
	): Promise<IntegrationMessageContext | null> {
		const context = readIntegrationMessageContext(persistence);
		return context === undefined ? await this.getLatest(persistence.threadId) : context;
	}

	async getLatestForIncoming(threadId: string): Promise<IntegrationMessageContext | null> {
		try {
			return await this.getLatest(threadId);
		} catch (error) {
			this.logger.warn('Failed to read previous integration message context', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	async installIncoming(
		context: IntegrationMessageContext,
		memory: SessionBinding,
		conversation: SessionBinding,
	): Promise<void> {
		const scopes =
			conversation.threadId === memory.threadId ? [conversation] : [conversation, memory];
		for (const { threadId, resourceId } of scopes) {
			try {
				await this.setLatest(threadId, resourceId, context);
			} catch (error) {
				this.logger.warn('Failed to update integration message context', {
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
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

	async bindSession(
		derivedThreadId: string,
		origin: SessionBinding,
		options: { recipientId?: string; outboundText?: string } = {},
	): Promise<void> {
		if (derivedThreadId === origin.threadId) return;
		// The first task to message a thread keeps the binding. Every task still
		// records what it sent, so the reply turn sees all of it.
		const existing = await this.resolveSession(derivedThreadId);
		if (!existing) {
			await this.appendBoundThread(
				origin.threadId,
				derivedThreadId,
				options.recipientId ?? derivedThreadId,
			);
			await this.writeContinueAsIfAbsent(derivedThreadId, origin);
		}
		if (options.outboundText) {
			await this.appendOutboundMessage(derivedThreadId, options.outboundText);
		}
	}

	async resolveSessionReplyScope(derivedThreadId: string): Promise<SessionReplyScope | null> {
		const binding = await this.resolveSession(derivedThreadId);
		if (!binding) return null;
		const derived = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const origin = await this.threadRepository.findOneBy({ id: binding.threadId });
		const bound = this.readBoundThreads(
			this.parseMetadata(origin?.metadata)[BOUND_THREADS_METADATA_KEY],
		);
		const recipient = bound[derivedThreadId] ?? derivedThreadId;
		return {
			binding,
			// The task messaged more than one recipient, so its memory holds other
			// recipients' messages. Several threads of one recipient do not count.
			sharedWithOtherRecipients: Object.values(bound).some((other) => other !== recipient),
			outboundMessages: this.readStringArray(
				this.parseMetadata(derived?.metadata)[OUTBOUND_METADATA_KEY],
			),
		};
	}

	async resolveSession(derivedThreadId: string): Promise<SessionBinding | null> {
		const thread = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const value = this.parseMetadata(thread?.metadata)[CONTINUE_AS_METADATA_KEY];
		return isSessionBinding(value) ? value : null;
	}

	async recordSentMessage(
		derivedThreadId: string,
		messageId: string,
		origin: SessionBinding,
	): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const previous = this.parseMetadata(existing?.metadata)[SENT_MESSAGES_METADATA_KEY];
		const entries = isRecord(previous) ? Object.entries(previous) : [];
		const sentMessages = Object.fromEntries(
			[...entries.filter(([id]) => id !== messageId), [messageId, origin]].slice(
				-MAX_SENT_MESSAGES_PER_THREAD,
			),
		);
		await this.writeMetadata(derivedThreadId, origin.resourceId, {
			[SENT_MESSAGES_METADATA_KEY]: sentMessages,
		});
	}

	async resolveSentMessage(
		derivedThreadId: string,
		messageId: string,
	): Promise<SessionBinding | null> {
		const thread = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const sentMessages = this.parseMetadata(thread?.metadata)[SENT_MESSAGES_METADATA_KEY];
		const value = isRecord(sentMessages) ? sentMessages[messageId] : undefined;
		return isSessionBinding(value) ? value : null;
	}

	async consumeOutboundMessages(derivedThreadId: string, count: number): Promise<void> {
		// Drops only the messages the turn carried, so one sent meanwhile stays.
		await this.threadRepository.patchThread(
			derivedThreadId,
			(row) => {
				const metadata = this.parseMetadata(row.metadata);
				const messages = this.readStringArray(metadata[OUTBOUND_METADATA_KEY]);
				if (messages.length === 0) return null;
				return {
					metadata: JSON.stringify({
						...metadata,
						[OUTBOUND_METADATA_KEY]: messages.slice(count),
					}),
				};
			},
			{},
		);
	}

	async unbindSession(derivedThreadId: string): Promise<void> {
		const binding = await this.resolveSession(derivedThreadId);
		await this.clearBinding(derivedThreadId);
		if (binding) await this.removeBoundThread(binding.threadId, derivedThreadId);
	}

	async clearSessionBindings(originThreadId: string): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: originThreadId });
		const bound = this.readBoundThreads(
			this.parseMetadata(existing?.metadata)[BOUND_THREADS_METADATA_KEY],
		);
		const derivedThreadIds = Object.keys(bound);
		if (derivedThreadIds.length === 0) return;
		for (const id of derivedThreadIds) await this.clearBinding(id);
		await this.threadRepository.patchThread(
			originThreadId,
			(row) => ({
				metadata: JSON.stringify({
					...this.parseMetadata(row.metadata),
					[BOUND_THREADS_METADATA_KEY]: {},
				}),
			}),
			{},
		);
	}

	/** Drops the binding and the task messages that waited for a reply. */
	private async clearBinding(derivedThreadId: string): Promise<void> {
		await this.writeMetadata(derivedThreadId, undefined, {
			[CONTINUE_AS_METADATA_KEY]: undefined,
			[OUTBOUND_METADATA_KEY]: undefined,
		});
	}

	private async removeBoundThread(originThreadId: string, derivedThreadId: string): Promise<void> {
		await this.threadRepository.patchThread(
			originThreadId,
			(row) => {
				const metadata = this.parseMetadata(row.metadata);
				const { [derivedThreadId]: _removed, ...rest } = this.readBoundThreads(
					metadata[BOUND_THREADS_METADATA_KEY],
				);
				return { metadata: JSON.stringify({ ...metadata, [BOUND_THREADS_METADATA_KEY]: rest }) };
			},
			{},
		);
	}

	private async appendOutboundMessage(derivedThreadId: string, text: string): Promise<void> {
		await this.threadRepository.patchThread(
			derivedThreadId,
			(row) => {
				const metadata = this.parseMetadata(row.metadata);
				const messages = [
					...this.readStringArray(metadata[OUTBOUND_METADATA_KEY]),
					text.slice(0, MAX_OUTBOUND_TEXT_LENGTH),
				];
				return {
					metadata: JSON.stringify({
						...metadata,
						[OUTBOUND_METADATA_KEY]: messages.slice(-MAX_OUTBOUND_MESSAGES),
					}),
				};
			},
			{},
		);
	}

	private readStringArray(value: unknown): string[] {
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === 'string')
			: [];
	}

	private async writeContinueAsIfAbsent(
		derivedThreadId: string,
		origin: SessionBinding,
	): Promise<void> {
		await this.updateMetadata(derivedThreadId, origin.resourceId, (metadata) =>
			isSessionBinding(metadata[CONTINUE_AS_METADATA_KEY])
				? null
				: { ...metadata, [CONTINUE_AS_METADATA_KEY]: origin },
		);
	}

	private async appendBoundThread(
		originThreadId: string,
		derivedThreadId: string,
		recipientId: string,
	): Promise<void> {
		await this.updateMetadata(originThreadId, originThreadId, (metadata) => ({
			...metadata,
			[BOUND_THREADS_METADATA_KEY]: {
				...this.readBoundThreads(metadata[BOUND_THREADS_METADATA_KEY]),
				[derivedThreadId]: recipientId,
			},
		}));
	}

	/**
	 * Maps each bound thread to its recipient. A platform with threads can give
	 * one person many threads. Older rows hold a plain list of thread ids, where
	 * each thread counts as its own recipient.
	 */
	private readBoundThreads(value: unknown): Record<string, string> {
		if (Array.isArray(value)) {
			return Object.fromEntries(this.readStringArray(value).map((id) => [id, id]));
		}
		if (!isRecord(value)) return {};
		return Object.fromEntries(
			Object.entries(value).filter(
				(entry): entry is [string, string] => typeof entry[1] === 'string',
			),
		);
	}

	private async writeMetadata(
		threadId: string,
		resourceId: string | undefined,
		patch: Record<string, unknown>,
	): Promise<void> {
		await this.updateMetadata(threadId, resourceId ?? threadId, (metadata) => ({
			...metadata,
			...patch,
		}));
	}

	/**
	 * Read-modify-write on the thread metadata under the row lock of
	 * `patchThread`, so overlapping writers do not drop each other's keys.
	 * `update` returns `null` to leave the row as it is. A missing row is
	 * created from `update({})`.
	 */
	private async updateMetadata(
		threadId: string,
		resourceId: string,
		update: (metadata: Record<string, unknown>) => Record<string, unknown> | null,
	): Promise<void> {
		const row = await this.threadRepository.patchThread(
			threadId,
			(current) => {
				const next = update(this.parseMetadata(current.metadata));
				return next ? { metadata: JSON.stringify(next) } : null;
			},
			{},
		);
		if (row) return;

		const created = update({});
		if (!created) return;
		await this.resourceRepository.ensureExists(resourceId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: threadId,
				resourceId,
				title: null,
				metadata: JSON.stringify(created),
			}),
		);
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

function isSessionBinding(value: unknown): value is SessionBinding {
	return (
		isRecord(value) && typeof value.threadId === 'string' && typeof value.resourceId === 'string'
	);
}
