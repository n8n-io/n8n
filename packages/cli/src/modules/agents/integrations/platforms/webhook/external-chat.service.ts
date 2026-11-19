import type { AgentChatAttachmentPayload, AgentSseEvent } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentChatAttachmentService } from '../../../agent-chat-attachment.service';
import { AgentChatExecutionService } from '../../../agent-chat-execution.service';
import { AgentChatRelayService } from '../../../agent-chat-relay.service';
import { AgentExecutionService } from '../../../agent-execution.service';
import { AgentMessageQueueService } from '../../../agent-message-queue.service';
import { AgentQueuedTestStreamService } from '../../../agent-queued-test-stream.service';
import type { ProjectAgent } from '../../../entities/agent.entity';
import { externalChatMemoryResourceId } from '../../../utils/agent-memory-scope';
import { EXTERNAL_CHAT_SOURCE, isExternalThreadOf } from '../../../utils/agent-thread-access';
import { executionsToMessagesDto } from '../../../utils/execution-to-message-mapper';
import { resolveInboundMimeType } from '../../../utils/inbound-attachments';
import { WebhookChannelError } from './responses-api';
import type { ChatPageUser, ChatSurfaceSettings } from './webhook-channel.service';

/** Widget events. The only shapes that reach an external principal (allow-list). */
export type ExternalChatEvent =
	| { type: 'conversation'; id: string }
	| { type: 'queued'; queueId: string }
	| { type: 'started'; executionId: string }
	| { type: 'text'; delta: string }
	| { type: 'tool-start'; id: string; name: string }
	| { type: 'tool-end'; id: string }
	| { type: 'notice'; text: string }
	| { type: 'done'; executionId?: string }
	| { type: 'error'; code: string; message: string };

// Tight limits for strangers. n8n Chat's own limits are sized for trusted users.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_UPLOADS_PER_MESSAGE = 1;
const UPLOAD_TYPES = [
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/plain',
	'text/csv',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Maps one n8n Chat stream event to a widget event, or drops it. Tool input and
 * output, suspension payloads, reasoning, usage and sub-agent traces never pass.
 */
export function toExternalEvent(event: AgentSseEvent): ExternalChatEvent | undefined {
	switch (event.type) {
		case 'message-queued':
			return { type: 'queued', queueId: event.queueId };
		case 'execution-started':
			return { type: 'started', executionId: event.executionId };
		case 'text-delta':
			return { type: 'text', delta: event.delta };
		case 'tool-call':
			return { type: 'tool-start', id: event.toolCallId, name: event.toolName };
		case 'tool-result':
			return { type: 'tool-end', id: event.toolCallId };
		case 'tool-call-suspended':
			return {
				type: 'notice',
				text: 'The agent wanted to run an action that needs approval. This chat cannot approve actions yet.',
			};
		case 'done':
			return { type: 'done', ...(event.executionId ? { executionId: event.executionId } : {}) };
		case 'error':
			// Provider and tool errors can carry internal details: the visitor gets a generic text.
			return { type: 'error', code: 'agent_error', message: 'The agent could not answer.' };
		default:
			return undefined;
	}
}

/**
 * SPIKE (agent-chat-embed), option B: the chat page of the n8n Chat channel. Turns
 * go through n8n Chat's backend (durable message queue, consumer, execution
 * recording, Stop) as an external principal, not as an n8n user and not as the
 * agent owner. The principal key is `user-<id>`, `invite-<id>` or, for an
 * anonymous visitor, `anon-<conversationId>` (the conversation
 * ID is then the visitor's only credential).
 */
@Service()
export class ExternalChatService {
	constructor(
		private readonly messageQueue: AgentMessageQueueService,
		private readonly queuedStreams: AgentQueuedTestStreamService,
		private readonly chatRelay: AgentChatRelayService,
		private readonly executionService: AgentExecutionService,
		private readonly chatExecution: AgentChatExecutionService,
		private readonly attachmentService: AgentChatAttachmentService,
	) {}

	/** The features this caller may use, and why one is off. Anonymous visitors get none. */
	features(surface: ChatSurfaceSettings, user: ChatPageUser | undefined) {
		const uploadsOff = !surface.features.uploads ? 'disabled' : !user ? 'anonymous' : undefined;
		return { uploads: !uploadsOff, ...(uploadsOff ? { uploadsOff } : {}) };
	}

	/** Queues one message and relays its turn. The turn continues when the caller disconnects. */
	async send(request: {
		agent: ProjectAgent;
		surface: ChatSurfaceSettings;
		user: ChatPageUser | undefined;
		body: unknown;
		write: (event: ExternalChatEvent) => void;
		abortSignal: AbortSignal;
	}): Promise<void> {
		const { agent, user, write } = request;
		const body = (request.body ?? {}) as Record<string, unknown>;
		const message = typeof body.message === 'string' ? body.message.trim() : '';
		const uploads = await this.parseUploads(body.attachments, request.surface, user);
		if (!message && !uploads.length) {
			throw new WebhookChannelError(400, 'invalid_request', 'message is required');
		}
		const requested = typeof body.conversationId === 'string' ? body.conversationId : undefined;
		if (requested !== undefined && !UUID.test(requested)) throw conversationNotFound();
		const conversationId = requested ?? randomUUID();
		const principal = this.principalOf(user, conversationId);
		if (requested) await this.requireConversation(agent, principal, requested);
		const resourceId = externalChatMemoryResourceId(principal);
		write({ type: 'conversation', id: conversationId });

		const attachments = await this.chatRelay.storeChatAttachments({
			attachments: uploads,
			agentId: agent.id,
			projectId: agent.projectId,
			threadId: conversationId,
			resourceId,
			source: EXTERNAL_CHAT_SOURCE,
		});
		let accepted = false;
		let subscription: ReturnType<AgentQueuedTestStreamService['subscribe']> | undefined;
		let closed!: () => void;
		const finished = new Promise<void>((resolve) => (closed = resolve));
		const delivery = {
			send: (event: AgentSseEvent) => {
				const mapped = toExternalEvent(event);
				if (mapped) write(mapped);
			},
			onChunk: () => {},
			abortSignal: request.abortSignal,
			close: () => closed(),
		};
		try {
			const result = await this.messageQueue.enqueue(
				{
					agentId: agent.id,
					projectId: agent.projectId,
					threadId: conversationId,
					sessionMode: requested ? 'existing' : 'new',
					source: EXTERNAL_CHAT_SOURCE,
					payload: {
						kind: 'external_chat',
						userId: principal,
						message,
						resourceId,
						attachments,
						// ponytail: background jobs stay off until a visitor can receive their results (recovery stream).
						options: { allowBackgroundTasks: false },
					},
				},
				(queueId) => {
					subscription = this.queuedStreams.subscribe(queueId, delivery);
				},
			);
			if (result.status === 'duplicate') {
				write({ type: 'done' });
				return;
			}
			accepted = true;
			subscription?.accepted();
			write({ type: 'queued', queueId: result.item.id });
			await Promise.race([subscription?.done, finished]);
		} finally {
			if (!accepted && attachments?.length) {
				await this.attachmentService.deleteByIds(attachments.map((ref) => ref.id));
			}
		}
	}

	/** The transcript and the waiting messages of one conversation, reduced to what a visitor may see. */
	async history(agent: ProjectAgent, user: ChatPageUser | undefined, conversationId: string) {
		if (!UUID.test(conversationId)) throw conversationNotFound();
		const principal = this.principalOf(user, conversationId);
		await this.requireConversation(agent, principal, conversationId);
		const detail = await this.executionService.getThreadDetail(
			conversationId,
			agent.projectId,
			agent.id,
			principal,
		);
		if (!detail) throw conversationNotFound();
		const messages = executionsToMessagesDto(detail.executions).map((entry) => ({
			role: entry.role === 'user' ? 'user' : 'agent',
			text: entry.content
				.filter((part) => part.type === 'text')
				.map((part) => part.text ?? '')
				.join(''),
			tools: entry.content
				.filter((part) => part.type === 'tool-call')
				.map((part) => ({ id: part.toolCallId ?? '', name: part.toolName ?? '' })),
			files: entry.content
				.filter((part) => part.type === 'file')
				.map((part) => ({ name: part.fileName ?? '' })),
			error: entry.executionError !== undefined,
		}));
		const queue = await this.messageQueue.listPending({
			projectId: agent.projectId,
			agentId: agent.id,
			threadId: conversationId,
			userId: principal,
			kind: 'external_chat',
		});
		return {
			messages,
			activeExecutionId:
				detail.executions.findLast((execution) => execution.status === 'running')?.id ?? null,
			pending: queue.items.map((item) => ({ id: item.id, text: item.message })),
		};
	}

	/** Stops the running turn of the caller's own conversation. Waiting messages stay queued. */
	async stop(
		agent: ProjectAgent,
		user: ChatPageUser | undefined,
		conversationId: string,
		executionId: unknown,
	) {
		if (!UUID.test(conversationId) || typeof executionId !== 'string') throw conversationNotFound();
		const principal = this.principalOf(user, conversationId);
		await this.requireConversation(agent, principal, conversationId);
		return await this.chatExecution.requestCancel({
			projectId: agent.projectId,
			agentId: agent.id,
			threadId: conversationId,
			executionId,
			userId: principal,
			surface: 'external',
			scope: 'foreground',
		});
	}

	private principalOf(user: ChatPageUser | undefined, conversationId: string) {
		return user ? user.key : `anon-${conversationId}`;
	}

	private async requireConversation(agent: ProjectAgent, principal: string, threadId: string) {
		const thread = await this.executionService.findThreadById(threadId);
		if (!thread || thread.agentId !== agent.id || !isExternalThreadOf(thread, principal)) {
			throw conversationNotFound();
		}
	}

	private async parseUploads(
		input: unknown,
		surface: ChatSurfaceSettings,
		user: ChatPageUser | undefined,
	): Promise<AgentChatAttachmentPayload[]> {
		if (input === undefined || (Array.isArray(input) && input.length === 0)) return [];
		if (!this.features(surface, user).uploads) {
			throw new WebhookChannelError(
				403,
				'uploads_disabled',
				'File uploads are not enabled for you.',
			);
		}
		if (!Array.isArray(input) || input.length > MAX_UPLOADS_PER_MESSAGE) {
			throw new WebhookChannelError(400, 'invalid_request', 'Send one file per message.');
		}
		const files: AgentChatAttachmentPayload[] = [];
		for (const file of input as unknown[]) {
			const { fileName, mimeType, data } = (file ?? {}) as Record<string, unknown>;
			if (
				typeof fileName !== 'string' ||
				typeof mimeType !== 'string' ||
				typeof data !== 'string'
			) {
				throw new WebhookChannelError(400, 'invalid_request', 'Invalid file.');
			}
			const bytes = Buffer.from(data, 'base64');
			if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
				throw new WebhookChannelError(400, 'upload_size', 'The file must be 2 MB or smaller.');
			}
			// Check the type the bytes have, not only the one the browser declares.
			const sniffed = await resolveInboundMimeType(mimeType, bytes);
			if (!UPLOAD_TYPES.includes(mimeType) || !UPLOAD_TYPES.includes(sniffed)) {
				throw new WebhookChannelError(400, 'upload_type', 'This file type is not allowed.');
			}
			files.push({ fileName: fileName.slice(0, 200), mimeType: sniffed, data });
		}
		return files;
	}
}

const conversationNotFound = () =>
	new WebhookChannelError(
		404,
		'conversation_not_found',
		'This conversation has ended. Send your message again to start a new one.',
	);
