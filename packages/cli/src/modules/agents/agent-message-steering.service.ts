import type { AgentDbMessage, AgentInputBoundary } from '@n8n/agents';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import { AgentExecutionService } from './agent-execution.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { messageToDto } from './agent-message-mapper';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import { type ExecutionRecorder, type TimelineEvent } from './execution-recorder';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { checkpointExecutionId, isInteractiveChatKind } from './types/agent-queued-message';
import type { SteeringConsumption } from './types/agent-steering';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';

interface SteeringContext {
	agentId: string;
	projectId: string;
	threadId: string;
	executionId: string;
	userId: string;
}

@Service()
export class AgentMessageSteeringService {
	constructor(
		private readonly txRunner: TransactionRunner,
		private readonly queue: AgentMessageQueueRepository,
		private readonly threads: AgentExecutionThreadRepository,
		private readonly executions: AgentExecutionRepository,
		private readonly messages: AgentMessageRepository,
		private readonly checkpoints: N8NCheckpointStorage,
		private readonly executionService: AgentExecutionService,
		private readonly updates: AgentExecutionUpdateBroadcaster,
	) {}

	async findEligible(thread: AgentExecutionThread, ctx: OperationContext = {}) {
		const execution = await this.executions.findSteerable(thread.id, ctx);
		if (!execution) return null;
		if (await this.checkpoints.findSuspendedForThread(thread.agentId, thread.id, ctx)) return null;
		return execution;
	}

	async close(threadId: string, executionId: string): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			if (!(await this.threads.lockById(threadId, ctx))) return;
			await this.release(threadId, executionId, ctx);
		});
		this.updates.notifyQueueUpdated(threadId);
	}

	/** Return unconsumed input to its saved queue position. The caller holds the session lock. */
	async release(threadId: string, executionId: string, ctx: OperationContext) {
		await this.executions.closeSteering(threadId, executionId, ctx);
		return await this.queue.releaseSteering(threadId, executionId, ctx);
	}

	async releaseInactive(thread: AgentExecutionThread, ctx: OperationContext): Promise<boolean> {
		const ids = await this.queue.findSteeringExecutionIds(thread.id, ctx);
		if (ids.length === 0) return false;
		const checkpoint = await this.checkpoints.findSuspendedForThread(
			thread.agentId,
			thread.id,
			ctx,
		);
		const suspendedExecutionId = checkpoint && checkpointExecutionId(checkpoint);
		let changed = false;
		for (const id of ids) {
			const execution = await this.executions.findExecution(id, ctx);
			if (
				execution?.status === 'running' &&
				execution.acceptsSteering &&
				id !== suspendedExecutionId
			)
				continue;
			changed = (await this.release(thread.id, id, ctx)) || changed;
		}
		return changed;
	}

	async consume(
		context: SteeringContext,
		boundary: AgentInputBoundary,
		recorder: ExecutionRecorder,
		signal: AbortSignal,
	): Promise<SteeringConsumption> {
		signal.throwIfAborted();
		const result = await this.executionService.withTimelineWritesPaused(
			context.executionId,
			async () => {
				const timeline = structuredClone(recorder.getMessageRecord().timeline);
				try {
					const consumed = await this.txRunner.run(
						{},
						async (ctx) => await this.consumeLocked(context, boundary, timeline, signal, ctx),
					);
					recorder.recordInputs(inputMarkers(consumed));
					return consumed;
				} catch (error) {
					// A commit can succeed before its acknowledgement fails. Keep its input in later snapshots.
					await this.restoreCommittedInputs(context.executionId, recorder);
					throw error;
				}
			},
		);
		if (result.events.length || boundary.completing || !boundary.canContinue || result.stopped) {
			this.updates.notifyQueueUpdated(context.threadId);
			this.updates.notify(context);
		}
		return result;
	}

	private async consumeLocked(
		context: SteeringContext,
		boundary: AgentInputBoundary,
		timeline: TimelineEvent[],
		signal: AbortSignal,
		ctx: OperationContext,
	): Promise<SteeringConsumption> {
		const { threadId, executionId, userId } = context;
		const thread = await this.threads.lockById(threadId, ctx);
		const execution = await this.executions.findExecution(executionId, ctx);
		signal.throwIfAborted();
		if (!thread || execution?.threadId !== threadId || execution.status !== 'running') {
			throw new OperationalError('Agent execution ownership was lost');
		}
		if (!execution.acceptsSteering) return { messages: [], events: [], stopped: true };
		if (!boundary.canContinue) {
			await this.release(threadId, executionId, ctx);
			return { messages: [], events: [], stopped: false };
		}
		const items = await this.queue.findSteering(threadId, executionId, ctx);
		if (items.length === 0) {
			if (boundary.completing) await this.executions.closeSteering(threadId, executionId, ctx);
			return { messages: [], events: [], stopped: false };
		}
		const resourceId = draftChatMemoryResourceId(userId);
		const consumed = this.prepareInput(items, executionId, boundary.lastCreatedAt);
		for (const { messageId } of items) {
			await this.messages.linkExecutionInput(executionId, messageId, { threadId, resourceId }, ctx);
		}
		await this.messages.saveRuntimeMessages(
			{ threadId, resourceId, executionId, messages: [...boundary.messages, ...consumed.messages] },
			ctx,
		);
		signal.throwIfAborted();
		if (
			!(await this.executions.updateTimelineIfRunning(
				executionId,
				[...timeline, ...inputMarkers(consumed)],
				ctx,
			))
		) {
			throw new OperationalError('Agent execution ownership was lost');
		}
		await this.queue.consumeSteering(
			threadId,
			executionId,
			items.map(({ id }) => id),
			ctx,
		);
		return consumed;
	}

	private prepareInput(
		items: AgentMessageQueue[],
		executionId: string,
		lastCreatedAt: number,
	): SteeringConsumption {
		let timestamp = Math.max(Date.now(), lastCreatedAt + 1);
		const messages: AgentDbMessage[] = [];
		const events: SteeringConsumption['events'] = [];
		for (const item of items) {
			if (!isInteractiveChatKind(item.payload.kind))
				throw new UnexpectedError('Only Preview and system agent input can be steered');
			const message: AgentDbMessage = {
				...(item.message.modelContent ?? item.message.content),
				id: item.messageId,
				createdAt: new Date(timestamp++),
			};
			const dto = messageToDto({
				...item.message.content,
				id: item.messageId,
				createdAt: item.message.createdAt,
			});
			if (dto?.role !== 'user') throw new UnexpectedError('Steering input must be a user message');
			messages.push(message);
			events.push({
				type: 'message-steered',
				queueId: item.id,
				executionId,
				message: {
					...dto,
					executionId,
					...(item.message.author ? { author: item.message.author } : {}),
				},
			});
		}
		return { messages, events, stopped: false };
	}

	private async restoreCommittedInputs(
		executionId: string,
		recorder: ExecutionRecorder,
	): Promise<void> {
		try {
			const execution = await this.executions.findExecution(executionId);
			recorder.recordInputs((execution?.timeline ?? []).filter((event) => event.type === 'input'));
		} catch {
			// Recovery retains the committed database timeline if recording cannot finish.
		}
	}
}

function inputMarkers(
	consumed: SteeringConsumption,
): Array<Extract<TimelineEvent, { type: 'input' }>> {
	return consumed.messages.map((message) => ({
		type: 'input',
		messageId: message.id,
		timestamp: message.createdAt.getTime(),
	}));
}
