import { LockNamespace, LockService } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionService } from './agent-execution.service';
import { AgentMessageSteeringService } from './agent-message-steering.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import {
	draftChatMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';
import { canContinueThreadInPreview, threadBelongsTo } from './utils/agent-thread-access';
import { getDelegatedChildCheckpoints } from './utils/delegated-child-checkpoints';

type ExecutionContext = PubSubCommandMap['cancel-agent-chat-execution'];

export interface CancelSuspendedRunParams {
	agentId: string;
	runId: string;
	resourceId: string;
}

export { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';

@Service()
export class AgentChatExecutionService {
	// Remote mains may never register the run. Retain early Stops beyond the recovery window.
	private static readonly PENDING_CANCEL_TTL_MS = 5 * 60 * 1000;
	private readonly pendingCancellations = new Map<
		string,
		{ context: ExecutionContext; timer: NodeJS.Timeout }
	>();
	private readonly executions = new Map<
		string,
		{ context: ExecutionContext; controller: AbortController }
	>();

	constructor(
		private readonly lockService: LockService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionUpdates: AgentExecutionUpdateBroadcaster,
		private readonly steering: AgentMessageSteeringService,
	) {}

	register(context: ExecutionContext, controller: AbortController): void {
		this.executions.set(context.executionId, { context, controller });
		const pending = this.pendingCancellations.get(context.executionId);
		if (pending) {
			clearTimeout(pending.timer);
			this.pendingCancellations.delete(context.executionId);
			this.cancelLocal(pending.context);
		}
	}

	async settle(
		executionId: string,
		finalize: () => Promise<void>,
		suspendedRunId?: string,
	): Promise<void> {
		try {
			await finalize();
		} finally {
			await this.release(executionId, suspendedRunId);
		}
	}

	private async release(executionId: string, suspendedRunId?: string): Promise<void> {
		const execution = this.executions.get(executionId);
		try {
			if (!execution?.controller.signal.aborted || !suspendedRunId) return;
			const { context } = execution;
			await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				`agent-preview-turn:${context.threadId}`,
				async () => {
					const latest = await this.executionRepository.findLatestByThreadId(context.threadId);
					if (latest?.id !== executionId) return;
					await this.cancelSuspended({
						agentId: context.agentId,
						runId: suspendedRunId,
						resourceId: draftChatMemoryResourceId(context.userId),
					});
				},
			);
		} finally {
			this.executions.delete(executionId);
		}
	}

	async requestCancel(context: ExecutionContext): Promise<boolean> {
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-preview-turn:${context.threadId}`,
			async () => {
				const execution = await this.getOwnedExecution(context);
				if (!execution) throw new NotFoundError('Execution not found');
				await this.steering.close(context.threadId, context.executionId);
				if (this.cancelLocal(context)) return true;
				if (execution.status !== 'running') return await this.cancelRecordedSuspension(context);
				this.cancelOrRemember(context);
				if (!this.instanceSettings.isMultiMain) return true;
				await this.publisher.publishCommand({
					command: 'cancel-agent-chat-execution',
					payload: context,
				});
				return true;
			},
		);
	}

	@OnPubSubEvent('cancel-agent-chat-execution', { instanceType: 'main' })
	async handleCancel(context: ExecutionContext): Promise<void> {
		if (this.cancelLocal(context)) return;
		await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-preview-turn:${context.threadId}`,
			async () => {
				if (this.cancelLocal(context)) return;
				const execution = await this.getOwnedExecution(context);
				if (!execution) return;
				if (execution.status === 'running') this.cancelOrRemember(context);
				await this.cancelRecordedSuspension(context);
			},
		);
	}

	private cancelOrRemember(context: ExecutionContext): void {
		// Registration can finish while ownership validation awaits the database.
		if (this.cancelLocal(context) || this.pendingCancellations.has(context.executionId)) return;
		const timer = setTimeout(
			() => this.pendingCancellations.delete(context.executionId),
			AgentChatExecutionService.PENDING_CANCEL_TTL_MS,
		);
		timer.unref();
		this.pendingCancellations.set(context.executionId, { context, timer });
	}

	private cancelLocal(context: ExecutionContext): boolean {
		const execution = this.executions.get(context.executionId);
		if (
			!execution ||
			execution.context.projectId !== context.projectId ||
			execution.context.agentId !== context.agentId ||
			execution.context.threadId !== context.threadId ||
			execution.context.userId !== context.userId
		)
			return false;
		execution.controller.abort();
		return true;
	}

	private async getOwnedExecution(context: ExecutionContext) {
		const { threadId, projectId, agentId, userId, executionId } = context;
		const thread = await this.executionService.findThreadById(threadId);
		if (!thread || !threadBelongsTo(thread, projectId, agentId, userId)) return null;
		const execution = await this.executionRepository.findOneBy({ id: executionId, threadId });
		if (!execution || !canContinueThreadInPreview(thread, userId, execution.source)) return null;
		return execution;
	}

	private async cancelRecordedSuspension(context: ExecutionContext): Promise<boolean> {
		const latest = await this.executionRepository.findLatestByThreadId(context.threadId);
		if (latest?.id !== context.executionId || latest.hitlStatus !== 'suspended') return false;
		const checkpoint = await this.checkpointStorage.findSuspendedForThread(
			context.agentId,
			context.threadId,
		);
		const pending = Object.values(checkpoint?.pendingToolCalls ?? {}).find(
			(toolCall) => toolCall.suspended,
		);
		if (!pending?.suspended) return false;
		return await this.cancelSuspended({
			agentId: context.agentId,
			runId: pending.runId,
			resourceId: draftChatMemoryResourceId(context.userId),
		});
	}

	async cancelSuspended(params: CancelSuspendedRunParams): Promise<boolean> {
		const checkpointStatus = await this.checkpointStorage.getStatus(params.runId, params.agentId);
		if (checkpointStatus.status === 'not-found' || checkpointStatus.checkpoint === undefined)
			return false;
		const { checkpoint } = checkpointStatus;
		if (
			checkpoint.status !== 'suspended' ||
			checkpoint.persistence?.delegated === true ||
			checkpoint.persistence?.resourceId !== params.resourceId
		)
			return false;
		const thread = await this.executionService.findThreadById(checkpoint.persistence.threadId);
		const userId = userIdFromDraftChatMemoryResourceId(params.resourceId);
		if (thread && (!userId || !threadBelongsTo(thread, thread.projectId, params.agentId, userId)))
			return false;
		const childCheckpoints = getDelegatedChildCheckpoints(checkpoint, params.agentId);
		if (checkpointStatus.status === 'active') {
			const cancelled = await this.checkpointStorage.cancelSuspended(
				params.runId,
				checkpoint,
				params.agentId,
			);
			if (!cancelled) return false;
		}
		await Promise.all(
			childCheckpoints.map(
				async ({ runId, agentId }) => await this.checkpointStorage.delete(runId, agentId),
			),
		);
		await this.checkpointStorage.delete(params.runId, params.agentId);
		const execution = thread && (await this.executionRepository.findLatestByThreadId(thread.id));
		if (thread && execution) {
			this.executionUpdates.notify({
				projectId: thread.projectId,
				agentId: params.agentId,
				threadId: thread.id,
				executionId: execution.id,
			});
		}
		return true;
	}
}
