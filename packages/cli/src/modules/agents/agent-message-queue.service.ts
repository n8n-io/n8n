import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

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
import type { AgentSessionMode } from './utils/agent-thread-access';

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
		this.onAvailable?.(item.threadId);
		return item;
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
		const claimed = await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threadRepository.lockById(threadId, ctx);
			if (!thread || (await this.isBlocked(thread, ctx))) return null;
			const active = await this.repository.findActive(threadId, ctx);
			if (active?.executionId)
				await this.repository.removeActive(threadId, active.executionId, ctx);
			const item = await this.repository.findHead(threadId, ctx);
			if (!item || !(await canConsume(item, thread, ctx))) return null;
			const recording = this.recordingFor(item, thread);
			// Reservation creates the running execution and links it to this item in one transaction.
			// Runtime work starts only after the transaction commits.
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

	/**
	 * Release the queue item after execution and any suspension have ended.
	 * Ignore callbacks for an execution that no longer owns the item.
	 */
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
