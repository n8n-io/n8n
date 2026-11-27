import {
	EPISODIC_SCOPE_METADATA_KEY,
	encodeEpisodicScopeMetadata,
	readEpisodicScopeDecision,
	type EpisodicScopeDecision,
	type ToolContext,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue } from '@n8n/utils/json/to-json-value';
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
const MESSAGED_RECIPIENTS_METADATA_KEY = 'messagedRecipients';
const OUTBOUND_METADATA_KEY = 'outboundMessages';
const MAX_OUTBOUND_MESSAGES = 5;
const MAX_OUTBOUND_TEXT_LENGTH = 2000;
const SENT_MESSAGES_METADATA_KEY = 'sentMessages';
const EPISODIC_SCOPES_METADATA_KEY = 'episodicScopesByResource';

/** Older entries drop out, so the metadata of a busy thread stays small. */
const MAX_SENT_MESSAGES_PER_THREAD = 50;
const MAX_EPISODIC_SCOPES_PER_THREAD = 50;

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

	async setEpisodicScope(
		threadId: string,
		resourceId: string,
		decision: EpisodicScopeDecision,
	): Promise<void> {
		const encoded = encodeEpisodicScopeMetadata(decision)[EPISODIC_SCOPE_METADATA_KEY];

		await this.updateMetadata(threadId, resourceId, (metadata) => {
			const previous = metadata[EPISODIC_SCOPES_METADATA_KEY];
			const entries = isRecord(previous) ? Object.entries(previous) : [];
			const next = Object.fromEntries(
				[...entries.filter(([key]) => key !== resourceId), [resourceId, encoded]].slice(
					-MAX_EPISODIC_SCOPES_PER_THREAD,
				),
			);
			return { ...metadata, [EPISODIC_SCOPES_METADATA_KEY]: next };
		});
	}

	async getEpisodicScope(
		threadId: string,
		resourceId: string,
	): Promise<EpisodicScopeDecision | undefined> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		const scopes = this.parseMetadata(thread?.metadata)[EPISODIC_SCOPES_METADATA_KEY];
		if (!isRecord(scopes) || !(resourceId in scopes)) return undefined;

		// Delegate validation to `@n8n/agents` so stored entries stay aligned with the
		// canonical schema and malformed entries fail closed to `{ disabled: true }`.
		return readEpisodicScopeDecision({
			[EPISODIC_SCOPE_METADATA_KEY]: toJsonValue(scopes[resourceId]),
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
		const existing = await this.resolveLiveBinding(derivedThreadId);
		await this.recordRecipient(
			origin.threadId,
			options.recipientId ?? derivedThreadId,
			existing ? undefined : derivedThreadId,
		);
		if (!existing) await this.writeContinueAsIfAbsent(derivedThreadId, origin);
		if (options.outboundText) {
			await this.appendOutboundMessage(derivedThreadId, options.outboundText);
		}
	}

	async resolveSessionReplyScope(derivedThreadId: string): Promise<SessionReplyScope | null> {
		const binding = await this.readBinding(derivedThreadId);
		if (!binding) return null;
		const origin = await this.threadRepository.findOneBy({ id: binding.threadId });
		if (!origin) {
			await this.clearBinding(derivedThreadId, binding.threadId);
			return null;
		}
		const derived = await this.threadRepository.findOneBy({ id: derivedThreadId });
		const originMetadata = this.parseMetadata(origin?.metadata);
		const bound = this.readBoundThreads(originMetadata[BOUND_THREADS_METADATA_KEY]);
		const recipient = bound[derivedThreadId] ?? derivedThreadId;
		// Bound threads can be unbound, and a task that lost the binding race has
		// no bound entry. Its memory still holds those messages, so the messaged
		// recipients count too. Older rows only have the bound threads.
		const recipients = [
			...this.readStringArray(originMetadata[MESSAGED_RECIPIENTS_METADATA_KEY]),
			...Object.values(bound),
		];
		return {
			binding,
			// The task messaged more than one recipient, so its memory holds other
			// recipients' messages. Several threads of one recipient do not count.
			sharedWithOtherRecipients: recipients.some((other) => other !== recipient),
			outboundMessages: this.readStringArray(
				this.parseMetadata(derived?.metadata)[OUTBOUND_METADATA_KEY],
			),
		};
	}

	/**
	 * The session that the thread is bound to. A binding to a deleted session
	 * counts as no binding, so a missed cleanup does not route replies there.
	 */
	async resolveSession(derivedThreadId: string): Promise<SessionBinding | null> {
		const binding = await this.readBinding(derivedThreadId);
		if (!binding) return null;
		return (await this.threadRepository.existsBy({ id: binding.threadId })) ? binding : null;
	}

	/** Like {@link resolveSession}, and also clears a binding to a deleted session. */
	private async resolveLiveBinding(derivedThreadId: string): Promise<SessionBinding | null> {
		const binding = await this.readBinding(derivedThreadId);
		if (!binding) return null;
		if (await this.threadRepository.existsBy({ id: binding.threadId })) return binding;
		await this.clearBinding(derivedThreadId, binding.threadId);
		return null;
	}

	private async readBinding(derivedThreadId: string): Promise<SessionBinding | null> {
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

	async consumeOutboundMessages(derivedThreadId: string, carried: string[]): Promise<void> {
		// Drops only the messages the turn carried. The cap can push a carried
		// message out of the queue, so a position-based drop would remove a new one.
		await this.threadRepository.patchThread(
			derivedThreadId,
			(row) => {
				const metadata = this.parseMetadata(row.metadata);
				const messages = this.readStringArray(metadata[OUTBOUND_METADATA_KEY]);
				const remaining = [...messages];
				for (const text of carried) {
					const index = remaining.indexOf(text);
					if (index !== -1) remaining.splice(index, 1);
				}
				if (remaining.length === messages.length) return null;
				return { metadata: JSON.stringify({ ...metadata, [OUTBOUND_METADATA_KEY]: remaining }) };
			},
			{},
		);
	}

	async unbindSession(derivedThreadId: string): Promise<void> {
		// Read the stored binding, so a binding to a deleted session is cleared too.
		const binding = await this.readBinding(derivedThreadId);
		// A rebind may have changed the binding since it was read. Clear only the
		// state that was read, and touch the origin map only when it was cleared.
		let cleared = false;
		await this.updateMetadata(
			derivedThreadId,
			binding?.resourceId ?? derivedThreadId,
			(metadata) => {
				const current = metadata[CONTINUE_AS_METADATA_KEY];
				cleared = isSameBinding(isSessionBinding(current) ? current : null, binding);
				return cleared
					? {
							...metadata,
							[CONTINUE_AS_METADATA_KEY]: undefined,
							[OUTBOUND_METADATA_KEY]: undefined,
						}
					: null;
			},
		);
		if (cleared && binding) await this.removeBoundThread(binding.threadId, derivedThreadId);
	}

	/**
	 * The threads that the task session holds a binding on. Read this before the
	 * task thread is deleted, because the list is stored on that thread.
	 */
	async findBoundThreadIds(originThreadId: string, ctx: OperationContext): Promise<string[]> {
		const metadata = await this.threadRepository.findMetadataById(originThreadId, ctx);
		return Object.keys(
			this.readBoundThreads(this.parseMetadata(metadata)[BOUND_THREADS_METADATA_KEY]),
		);
	}

	/**
	 * Unbinds the given threads from a task session that was deleted. A thread
	 * that is now bound to a different session keeps that binding.
	 */
	async clearSessionBindings(originThreadId: string, boundThreadIds: string[]): Promise<void> {
		for (const id of boundThreadIds) await this.clearBinding(id, originThreadId);
	}

	/**
	 * Drops the binding and the task messages that waited for a reply. A thread
	 * that is now bound to a different session keeps that binding.
	 */
	private async clearBinding(derivedThreadId: string, originThreadId: string): Promise<void> {
		// `patchThread` skips a thread that no longer exists, so no empty row is created.
		await this.threadRepository.patchThread(
			derivedThreadId,
			(row) => {
				const metadata = this.parseMetadata(row.metadata);
				const binding = metadata[CONTINUE_AS_METADATA_KEY];
				if (!isSessionBinding(binding) || binding.threadId !== originThreadId) return null;
				return {
					metadata: JSON.stringify({
						...metadata,
						[CONTINUE_AS_METADATA_KEY]: undefined,
						[OUTBOUND_METADATA_KEY]: undefined,
					}),
				};
			},
			{},
		);
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

	/**
	 * Adds the recipient to the append-only list of everyone the task messaged.
	 * The list stays when a thread is unbound, because the task memory keeps the
	 * message. With `boundThreadId`, it also maps that thread to the recipient.
	 */
	private async recordRecipient(
		originThreadId: string,
		recipientId: string,
		boundThreadId?: string,
	): Promise<void> {
		await this.updateMetadata(originThreadId, originThreadId, (metadata) => {
			const recipients = this.readStringArray(metadata[MESSAGED_RECIPIENTS_METADATA_KEY]);
			const next = recipients.includes(recipientId) ? null : [...recipients, recipientId];
			if (!next && !boundThreadId) return null;
			return {
				...metadata,
				...(next ? { [MESSAGED_RECIPIENTS_METADATA_KEY]: next } : {}),
				...(boundThreadId
					? {
							[BOUND_THREADS_METADATA_KEY]: {
								...this.readBoundThreads(metadata[BOUND_THREADS_METADATA_KEY]),
								[boundThreadId]: recipientId,
							},
						}
					: {}),
			};
		});
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

function isSameBinding(a: SessionBinding | null, b: SessionBinding | null): boolean {
	return a?.threadId === b?.threadId && a?.resourceId === b?.resourceId;
}
