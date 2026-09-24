import type { AgentDbMessage, AgentInputBoundary } from '@n8n/agents';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

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
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { checkpointExecutionId } from './types/agent-queued-message';
import type { SteeringConsumption } from './types/agent-steering';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { buildInboundUserMessage } from './utils/inbound-attachments';

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
		private readonly messageThreads: AgentThreadRepository,
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

	/** Return unconsumed input to its original FIFO position. The caller holds the session lock. */
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
		const result = await this.executionService.withTimelineWritesPaused(
			context.executionId,
			async () => {
				const timeline = structuredClone(recorder.getMessageRecord().timeline);
				try {
					const consumed = await this.commitInput(context, boundary, timeline, signal);
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

	private async commitInput(
		context: SteeringContext,
		boundary: AgentInputBoundary,
		timeline: TimelineEvent[],
		signal: AbortSignal,
	): Promise<SteeringConsumption> {
		for (;;) {
			signal.throwIfAborted();
			const items = await this.queue.findSteering(context.threadId, context.executionId, {});
			const staged = this.prepareInput(items, context.executionId, boundary.lastCreatedAt);
			const result = await this.txRunner.run(
				{},
				async (ctx) => await this.consumeLocked(context, boundary, timeline, staged, signal, ctx),
			);
			if (result) return result;
			// A new reservation changed the batch. Stage its IDs before opening another transaction.
		}
	}

	private async consumeLocked(
		context: SteeringContext,
		boundary: AgentInputBoundary,
		timeline: TimelineEvent[],
		staged: SteeringConsumption,
		signal: AbortSignal,
		ctx: OperationContext,
	): Promise<SteeringConsumption | null> {
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
		if (
			items.length !== staged.events.length ||
			items.some((item, index) => item.id !== staged.events[index].queueId)
		)
			return null;
		if (items.length === 0) {
			if (boundary.completing) await this.executions.closeSteering(threadId, executionId, ctx);
			return { messages: [], events: [], stopped: false };
		}
		const resourceId = draftChatMemoryResourceId(userId);
		await this.messageThreads.ensureExists(threadId, resourceId, ctx);
		await this.messages.saveMessages(
			threadId,
			resourceId,
			[...boundary.messages, ...staged.messages],
			ctx,
		);
		signal.throwIfAborted();
		if (
			!(await this.executions.updateTimelineIfRunning(
				executionId,
				[...timeline, ...inputMarkers(staged)],
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
		return staged;
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
			if (item.payload.kind !== 'preview')
				throw new UnexpectedError('Only Preview input can be steered');
			const [input] = buildInboundUserMessage(item.payload.message, item.payload.attachments ?? []);
			const message: AgentDbMessage = {
				...input,
				id: randomUUID(),
				createdAt: new Date(timestamp++),
			};
			const dto = messageToDto(message);
			if (!dto) throw new UnexpectedError('Steering input must be a user message');
			messages.push(message);
			events.push({
				type: 'message-steered',
				queueId: item.id,
				executionId,
				message: { ...dto, executionId },
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
	return consumed.events.map((event, index) => ({
		type: 'input',
		queueId: event.queueId,
		message: event.message,
		timestamp: consumed.messages[index].createdAt.getTime(),
	}));
}
