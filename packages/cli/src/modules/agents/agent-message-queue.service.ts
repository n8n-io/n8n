import type { AgentChatQueueResponse } from '@n8n/api-types';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
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
	) {}

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
		if (!thread) return { items: [] };
		await this.assertPreviewAccess(thread, input);
		const items = await this.repository.listPending(thread.id);
		return {
			items: items
				.filter((item) => item.payload.kind === 'preview')
				.map((item) => ({
					id: item.id,
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

	async claimNext(
		threadId: string,
		canConsume: (
			item: AgentMessageQueue,
			thread: AgentExecutionThread,
			ctx: OperationContext,
		) => Promise<boolean>,
	): Promise<ClaimedAgentMessage | null> {
		const claimed = await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(threadId, ctx);
			if (!thread || (await this.isBlocked(thread, ctx))) return null;
			const active = await this.repository.findActive(threadId, ctx);
			if (active?.executionId)
				await this.repository.removeActive(threadId, active.executionId, ctx);
			const item = await this.repository.findHead(threadId, ctx);
			if (!item || !(await canConsume(item, thread, ctx))) return null;
			const recording = this.recordingFor(item, thread);
			const reservation = await this.executionService.reserveExecution(recording, new Date(), ctx);
			return { item, thread, recording, reservation };
		});
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

	async settle(threadId: string, executionId: string): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(threadId, ctx);
			if (!thread) return;
			const active = await this.repository.findActive(threadId, ctx);
			if (active?.executionId !== executionId || (await this.isBlocked(thread, ctx))) return;
			await this.repository.removeActive(threadId, executionId, ctx);
		});
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
			userMessage: item.payload.message,
			source: item.source,
			attachments: item.payload.attachments,
			author: item.payload.kind === 'integration' ? item.payload.author : undefined,
		};
	}
}
