import type { Message } from '@n8n/agents';
import type { AgentChatQueueResponse, AgentMessageAuthor } from '@n8n/api-types';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { ConflictError, BadRequestError, NotFoundError } from '@n8n/errors';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentMessageSteeringService } from './agent-message-steering.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentExecutionService, type StartExecutionParams } from './agent-execution.service';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import type { AgentMessageOrigin } from './entities/agent-message.entity';
import { ExecutionRecorder } from './execution-recorder';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import {
	AgentMessageIdConflictError,
	AgentMessageRepository,
} from './repositories/agent-message.repository';
import { AgentRepository } from './repositories/agent.repository';
import type {
	AgentExecutionAdmission,
	AgentQueuedMessage,
	AgentQueueDispatch,
	QueuedIntegrationMessage,
	QueuedUserChatMessage,
} from './types/agent-queued-message';
import {
	canContinueThreadInN8nChat,
	canContinueThreadInPreview,
	type AgentSessionMode,
} from './utils/agent-thread-access';
import { buildInboundUserMessage, readInboundUserMessage } from './utils/inbound-attachments';
import { queuedMessageId } from './utils/queued-message-id';

export interface ClaimedAgentMessage {
	item: AgentMessageQueue;
	payload: Omit<QueuedUserChatMessage, 'userId' | 'messageId'> | QueuedIntegrationMessage;
	thread: AgentExecutionThread;
	/** Admission identifies the committed execution that the turn pipeline must reuse. */
	admission: AgentExecutionAdmission;
	recording: StartExecutionParams;
}

interface PendingMessageScope {
	projectId: string;
	agentId: string;
	threadId: string;
	userId: string;
	/** The chat surface that owns the session. */
	kind: QueuedUserChatMessage['kind'];
}

@Service()
export class AgentMessageQueueService {
	/** The main consumer installs this callback. Webhook processes only enqueue. */
	onAvailable?: (threadId: string) => void;

	constructor(
		private readonly txRunner: TransactionRunner,
		private readonly repository: AgentMessageQueueRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly agentRepository: AgentRepository,
		private readonly attachments: AgentChatAttachmentService,
		private readonly updates: AgentExecutionUpdateBroadcaster,
		private readonly messages: AgentMessageRepository,
		private readonly steering: AgentMessageSteeringService,
	) {}

	/** Save a pending message. It is durably accepted when the transaction commits. */
	async enqueue(
		input: {
			agentId: string;
			projectId: string;
			threadId: string;
			sessionMode: AgentSessionMode;
			source: string;
			payload: AgentQueuedMessage;
		},
		onInserted?: (queueId: string) => void,
	): Promise<{ status: 'accepted'; item: AgentMessageQueue } | { status: 'duplicate' }> {
		const agent = await this.agentRepository.findByIdAndProjectId(input.agentId, input.projectId);
		if (!agent) throw new UserError('Agent not found');
		const { payload } = input;
		const messageId = queuedMessageId(input.agentId, input.threadId, payload);
		let item: AgentMessageQueue;
		try {
			item = await this.txRunner.run({}, async (ctx) => {
				await this.executionService.prepareThread(
					{
						...input,
						agentName: agent.name,
						userMessage: payload.message,
						resourceId: payload.resourceId,
						access:
							payload.kind === 'integration'
								? { accessScope: 'project', ownerId: null }
								: { accessScope: 'user', ownerId: payload.userId },
					},
					ctx,
				);
				const inserted = await this.enqueueMessage(
					input.threadId,
					input.source,
					payload,
					ctx,
					messageId,
				);
				// Register delivery before another main can see the committed item.
				onInserted?.(inserted.id);
				return inserted;
			});
		} catch (error) {
			// A duplicate must roll back session and thread creation before it returns.
			if (error instanceof AgentMessageIdConflictError && error.messageId === messageId) {
				return { status: 'duplicate' };
			}
			throw error;
		}
		if (payload.kind !== 'integration') this.updates.notifyQueueUpdated(item.threadId);
		this.onAvailable?.(item.threadId);
		return { status: 'accepted', item };
	}

	private async enqueueMessage(
		threadId: string,
		source: string,
		payload: AgentQueuedMessage,
		ctx: OperationContext,
		messageId?: string,
	): Promise<AgentMessageQueue> {
		const { message, resourceId, attachments = [], ...dispatch } = payload;
		const [content] = buildInboundUserMessage(message, attachments);
		let queueDispatch: AgentQueueDispatch;
		let modelContent: Message | undefined;
		let author: AgentMessageAuthor | undefined;
		let origin: AgentMessageOrigin = { source };
		if (dispatch.kind === 'integration') {
			const {
				modelMessage,
				author: inputAuthor,
				platformThreadId,
				messageContext: fullContext,
				...integrationDispatch
			} = dispatch;
			const {
				platform: _platform,
				integrationConnectionId,
				messageId: platformMessageId,
				...messageContext
			} = fullContext;
			queueDispatch = { ...integrationDispatch, messageContext };
			[modelContent] = buildInboundUserMessage(modelMessage, attachments);
			author = inputAuthor;
			origin = {
				source,
				integrationConnectionId,
				platformMessageId,
				platformThreadId,
			};
		} else {
			queueDispatch = { kind: dispatch.kind };
		}
		const input = await this.messages.createInput(
			{ id: messageId, threadId, resourceId, content, modelContent, author, origin },
			ctx,
		);
		return await this.repository.enqueue(threadId, input.id, queueDispatch, ctx);
	}

	async listPending(input: PendingMessageScope): Promise<AgentChatQueueResponse> {
		const { kind } = input;
		const thread = await this.threadRepository.findOneBy({ id: input.threadId });
		// A client-created session can have no accepted messages yet.
		if (!thread) return { items: [], steerableExecutionId: null };
		await this.assertUserChatAccess(thread, input);
		const items = await this.repository.listPending(thread.id);
		// Only Preview executions accept steering.
		const steerable = kind === 'preview' ? await this.steering.findEligible(thread) : null;
		return {
			steerableExecutionId: steerable?.id ?? null,
			items: items
				.filter((item) => item.payload.kind === kind)
				// Show accepted steers first. Keep future turns in their saved queue order.
				.sort(
					(a, b) =>
						(a.steeringOrder ?? Number.MAX_SAFE_INTEGER) -
						(b.steeringOrder ?? Number.MAX_SAFE_INTEGER),
				)
				.map((item) => ({
					id: item.id,
					...readInboundUserMessage(item.message.content),
					steeringExecutionId: item.steeringExecutionId,
					createdAt: item.createdAt.toISOString(),
				})),
		};
	}

	async removePending(input: PendingMessageScope & { queueId: string }): Promise<void> {
		const removed = await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertUserChatAccess(thread, input, ctx);
			const item = await this.repository.findItem(thread.id, input.queueId, ctx);
			if (!item || item.payload.kind !== input.kind)
				throw new NotFoundError('Queued message not found');
			if (
				item.executionId !== null ||
				item.steeringExecutionId !== null ||
				!(await this.repository.removePending(thread.id, item.id, ctx))
			) {
				throw new ConflictError('This message has already started');
			}
			const attachmentIds = readInboundUserMessage(item.message.content).attachments.map(
				({ id }) => id,
			);
			await this.messages.clearPendingInput(item.messageId, ctx);
			return { threadId: item.threadId, attachmentIds };
		});
		this.updates.notifyQueueUpdated(removed.threadId);
		await this.attachments.deleteByIds(removed.attachmentIds);
	}

	async updatePending(
		input: PendingMessageScope & { queueId: string; message: string },
	): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertUserChatAccess(thread, input, ctx);
			const item = await this.repository.findItem(thread.id, input.queueId, ctx);
			if (!item || item.payload.kind !== input.kind)
				throw new NotFoundError('Queued message not found');
			if (item.executionId !== null) throw new ConflictError('This message has already started');
			if (item.steeringExecutionId !== null)
				throw new ConflictError('This message is no longer available');
			const message = input.message.trim();
			const { attachments } = readInboundUserMessage(item.message.content);
			if (!message && !attachments.length)
				throw new BadRequestError('A message or attachment is required');
			const [content] = buildInboundUserMessage(message, attachments);
			await this.messages.updatePendingInput(item.messageId, content, ctx);
		});
		this.updates.notifyQueueUpdated(input.threadId);
	}

	async reorderPending(input: {
		projectId: string;
		agentId: string;
		threadId: string;
		userId: string;
		queueId: string;
		targetQueueId: string;
		expectedQueueIds: string[];
	}): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertUserChatAccess(thread, { ...input, kind: 'preview' }, ctx);
			const moved = await this.repository.movePending(
				thread.id,
				input.queueId,
				input.targetQueueId,
				input.expectedQueueIds,
				ctx,
			);
			if (!moved) {
				throw new ConflictError('The queue has changed. Refresh it and try again.');
			}
		});
		this.updates.notifyQueueUpdated(input.threadId);
	}

	async steer(input: {
		projectId: string;
		agentId: string;
		threadId: string;
		userId: string;
		queueId: string;
		executionId: string;
	}): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertUserChatAccess(thread, { ...input, kind: 'preview' }, ctx);
			const item = await this.repository.findItem(thread.id, input.queueId, ctx);
			if (!item || item.payload.kind !== 'preview')
				throw new ConflictError('This message is no longer available');
			const execution = await this.steering.findEligible(thread, ctx);
			if (
				execution?.id !== input.executionId ||
				item.executionId !== null ||
				item.steeringExecutionId !== null
			) {
				throw new ConflictError('This message cannot be added to that execution');
			}
			if (!(await this.repository.reserveSteering(thread.id, item.id, execution.id, ctx))) {
				throw new ConflictError('This message is no longer available');
			}
		});
		this.updates.notifyQueueUpdated(input.threadId);
	}

	private async assertUserChatAccess(
		thread: AgentExecutionThread,
		input: Omit<PendingMessageScope, 'threadId'>,
		ctx: OperationContext = {},
	): Promise<void> {
		const sources = await this.executionRepository.findFirstSourceByThreadIds([thread.id], ctx);
		const source = sources.get(thread.id);
		if (
			thread.projectId !== input.projectId ||
			thread.agentId !== input.agentId ||
			!(input.kind === 'n8n_chat'
				? canContinueThreadInN8nChat(thread, input.userId, source)
				: canContinueThreadInPreview(thread, input.userId, source))
		) {
			throw new NotFoundError('Session not found');
		}
	}

	/**
	 * Give the next pending message exclusive use of the session for its execution.
	 * Running work and valid suspended checkpoints block a claim.
	 */
	async claimNext(
		threadId: string,
		canConsume: (
			item: AgentMessageQueue,
			thread: AgentExecutionThread,
			ctx: OperationContext,
		) => Promise<boolean>,
	): Promise<ClaimedAgentMessage | null> {
		let steeringChanged = false;
		const claimed = await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(threadId, ctx);
			if (!thread) return null;
			steeringChanged = await this.steering.releaseInactive(thread, ctx);
			if (await this.isBlocked(thread, ctx)) return null;
			const active = await this.repository.findActive(threadId, ctx);
			if (active?.executionId)
				await this.repository.removeActive(threadId, active.executionId, ctx);
			const item = await this.repository.findHead(threadId, ctx);
			if (!item || item.steeringExecutionId !== null || !(await canConsume(item, thread, ctx)))
				return null;
			const payload = this.restoreInput(item);
			const recording = this.recordingFor(item, thread, payload);
			await this.threadRepository.bumpUpdatedAt(threadId, ctx);
			// Reservation creates the running execution and links it to this item in one transaction.
			// Runtime work starts only after the transaction commits.
			const reservation = await this.executionService.reserveExecution(
				recording,
				new Date(),
				ctx,
				thread,
			);
			return { item, thread, payload, recording, reservation };
		});
		if (steeringChanged) this.updates.notifyQueueUpdated(threadId);
		if (!claimed) return null;
		this.executionService.activateExecution(claimed.reservation, claimed.recording);
		const { execution } = claimed.reservation;
		if (!execution.startedAt) throw new OperationalError('Queued execution has no start time');
		return {
			item: claimed.item,
			payload: claimed.payload,
			thread: claimed.thread,
			recording: claimed.recording,
			admission: {
				executionId: execution.id,
				startedAt: execution.startedAt,
				inputMessageIds: claimed.reservation.inputMessageIds,
			},
		};
	}

	/**
	 * Release the queue item after execution and any suspension have ended.
	 * Ignore callbacks for an execution that no longer owns the item.
	 */
	async settle(threadId: string, executionId: string): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(threadId, ctx);
			if (!thread) return;
			await this.steering.release(threadId, executionId, ctx);
			const active = await this.repository.findActive(threadId, ctx);
			if (active?.executionId !== executionId || (await this.isBlocked(thread, ctx))) return;
			await this.repository.removeActive(threadId, executionId, ctx);
		});
		this.updates.notifyQueueUpdated(threadId);
		this.onAvailable?.(threadId);
	}

	async recordFailure(
		claim: ClaimedAgentMessage,
		error: unknown,
		signal?: AbortSignal,
	): Promise<void> {
		const { executionId, startedAt } = claim.admission;
		const execution = await this.executionRepository.findExecution(executionId);
		if (execution?.status !== 'running') return;
		const recorder = new ExecutionRecorder(undefined, undefined, undefined, startedAt);
		if (!signal?.aborted) recorder.record({ type: 'error', error });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const record = recorder.getMessageRecord();
		// Preserve committed input when a later preparation or recording step fails.
		if (execution.timeline) record.timeline = execution.timeline;
		await this.executionService.finalizeExecution(executionId, {
			...claim.recording,
			record: signal?.aborted ? { ...record, finishReason: 'cancelled', error: null } : record,
		});
	}

	private async isBlocked(thread: AgentExecutionThread, ctx: OperationContext): Promise<boolean> {
		if (await this.executionRepository.existsRunningByThread(thread.id, ctx)) return true;
		return (
			(await this.checkpointStorage.findSuspendedForThread(thread.agentId, thread.id, ctx)) !== null
		);
	}

	private recordingFor(
		item: AgentMessageQueue,
		thread: AgentExecutionThread,
		payload: ClaimedAgentMessage['payload'],
	): StartExecutionParams {
		return {
			threadId: thread.id,
			agentId: thread.agentId,
			agentName: thread.agentName,
			projectId: thread.projectId,
			access: { accessScope: thread.accessScope, ownerId: thread.ownerId },
			sessionMode: 'existing',
			queueItemId: item.id,
			previewChat: item.payload.kind === 'preview',
			userMessage: payload.message,
			resourceId: payload.resourceId,
			source: item.message.origin?.source ?? undefined,
			attachments: payload.attachments,
			author: payload.kind === 'integration' ? payload.author : undefined,
		};
	}

	private restoreInput(item: AgentMessageQueue): ClaimedAgentMessage['payload'] {
		const input = {
			...readInboundUserMessage(item.message.content),
			resourceId: item.message.resourceId,
		};
		if (item.payload.kind !== 'integration') return { ...item.payload, ...input };
		if (!item.message.author) throw new UnexpectedError('Queued integration input has no author');
		const { origin } = item.message;
		if (!origin?.source || !origin.integrationConnectionId || !origin.platformThreadId)
			throw new UnexpectedError('Queued integration input has incomplete origin');
		return {
			...item.payload,
			...input,
			platformThreadId: origin.platformThreadId,
			messageContext: {
				...item.payload.messageContext,
				platform: origin.source,
				integrationConnectionId: origin.integrationConnectionId,
				...(origin.platformMessageId !== undefined ? { messageId: origin.platformMessageId } : {}),
			},
			author: item.message.author,
			modelMessage: readInboundUserMessage(item.message.modelContent ?? item.message.content)
				.message,
		};
	}
}
