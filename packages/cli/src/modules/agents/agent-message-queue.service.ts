import type { AgentChatQueueResponse } from '@n8n/api-types';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentMessageSteeringService } from './agent-message-steering.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentExecutionService, type StartExecutionParams } from './agent-execution.service';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import { ExecutionRecorder } from './execution-recorder';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentRepository } from './repositories/agent.repository';
import type { AgentExecutionAdmission, AgentQueuedMessage } from './types/agent-queued-message';
import { canContinueThreadInPreview, type AgentSessionMode } from './utils/agent-thread-access';

export interface ClaimedAgentMessage {
	item: AgentMessageQueue;
	thread: AgentExecutionThread;
	/** Admission identifies the committed execution that the turn pipeline must reuse. */
	admission: AgentExecutionAdmission;
	recording: StartExecutionParams;
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
	): Promise<AgentMessageQueue> {
		const agent = await this.agentRepository.findByIdAndProjectId(input.agentId, input.projectId);
		if (!agent) throw new UserError('Agent not found');
		const { payload } = input;
		const item = await this.txRunner.run({}, async (ctx) => {
			await this.executionService.prepareThread(
				{
					...input,
					agentName: agent.name,
					userMessage: payload.message,
					access:
						payload.kind === 'preview'
							? { accessScope: 'user', ownerId: payload.userId }
							: { accessScope: 'project', ownerId: null },
				},
				ctx,
			);
			const inserted = await this.repository.enqueue(input.threadId, input.source, payload, ctx);
			// Register delivery before another main can see the committed item.
			onInserted?.(inserted.id);
			return inserted;
		});
		if (payload.kind === 'preview') this.updates.notifyQueueUpdated(item.threadId);
		this.onAvailable?.(item.threadId);
		return item;
	}

	async listPending(input: {
		projectId: string;
		agentId: string;
		threadId: string;
		userId: string;
	}): Promise<AgentChatQueueResponse> {
		const thread = await this.threadRepository.findOneBy({ id: input.threadId });
		// A client-created Preview session can have no accepted messages yet.
		if (!thread) return { items: [], steerableExecutionId: null };
		await this.assertPreviewAccess(thread, input);
		const items = await this.repository.listPending(thread.id);
		const steerable = await this.steering.findEligible(thread);
		return {
			steerableExecutionId: steerable?.id ?? null,
			items: items
				.filter((item) => item.payload.kind === 'preview')
				.map((item) => ({
					id: item.id,
					steeringExecutionId: item.steeringExecutionId,
					message: item.payload.message,
					attachments: item.payload.attachments,
					createdAt: item.createdAt.toISOString(),
				})),
		};
	}

	async removePending(input: {
		projectId: string;
		agentId: string;
		threadId: string;
		userId: string;
		queueId: string;
	}): Promise<void> {
		const item = await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertPreviewAccess(thread, input, ctx);
			const item = await this.repository.findItem(thread.id, input.queueId, ctx);
			if (!item || item.payload.kind !== 'preview')
				throw new NotFoundError('Queued message not found');
			if (
				item.executionId !== null ||
				item.steeringExecutionId !== null ||
				!(await this.repository.removePending(thread.id, item.id, ctx))
			) {
				throw new ConflictError('This message has already started');
			}
			return item;
		});
		this.updates.notifyQueueUpdated(item.threadId);
		await this.attachments.deleteByIds(item.payload.attachments?.map(({ id }) => id) ?? []);
	}

	async updatePending(input: {
		projectId: string;
		agentId: string;
		threadId: string;
		userId: string;
		queueId: string;
		message: string;
	}): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(input.threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			await this.assertPreviewAccess(thread, input, ctx);
			const item = await this.repository.findItem(thread.id, input.queueId, ctx);
			if (!item || item.payload.kind !== 'preview')
				throw new NotFoundError('Queued message not found');
			if (item.executionId !== null) throw new ConflictError('This message has already started');
			if (item.steeringExecutionId !== null)
				throw new ConflictError('This message is no longer available');
			const message = input.message.trim();
			if (!message && !item.payload.attachments?.length)
				throw new BadRequestError('A message or attachment is required');
			const updated = await this.repository.updatePendingPayload(
				thread.id,
				item.id,
				{ ...item.payload, message },
				ctx,
			);
			if (!updated) throw new ConflictError('This message has already started');
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
			await this.assertPreviewAccess(thread, input, ctx);
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

	private async assertPreviewAccess(
		thread: AgentExecutionThread,
		input: { projectId: string; agentId: string; userId: string },
		ctx: OperationContext = {},
	): Promise<void> {
		const sources = await this.executionRepository.findFirstSourceByThreadIds([thread.id], ctx);
		if (
			thread.projectId !== input.projectId ||
			thread.agentId !== input.agentId ||
			!canContinueThreadInPreview(thread, input.userId, sources.get(thread.id))
		) {
			throw new NotFoundError('Session not found');
		}
	}

	/**
	 * Give the oldest pending message exclusive use of the session for its execution.
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
			const recording = this.recordingFor(item, thread);
			// Reservation creates the running execution and links it to this item in one transaction.
			// Runtime work starts only after the transaction commits.
			const reservation = await this.executionService.reserveExecution(recording, new Date(), ctx);
			return { item, thread, recording, reservation };
		});
		if (steeringChanged) this.updates.notifyQueueUpdated(threadId);
		if (!claimed) return null;
		this.executionService.activateExecution(claimed.reservation, claimed.recording);
		const { execution } = claimed.reservation;
		if (!execution.startedAt) throw new OperationalError('Queued execution has no start time');
		return {
			item: claimed.item,
			thread: claimed.thread,
			recording: claimed.recording,
			admission: { executionId: execution.id, startedAt: execution.startedAt },
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
			userMessage: item.payload.message,
			source: item.source,
			attachments: item.payload.attachments,
			author: item.payload.kind === 'integration' ? item.payload.author : undefined,
		};
	}
}
