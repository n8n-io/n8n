import { LockNamespace, LockService } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@n8n/errors';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionService } from './agent-execution.service';
import { AgentMessageSteeringService } from './agent-message-steering.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { PARENT_TASK_CANCELLED_REASON } from './background/sub-agent-background-state';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import {
	userIdFromDraftChatMemoryResourceId,
	userIdFromProductionChatMemoryResourceId,
	userIdFromSystemChatMemoryResourceId,
} from './utils/agent-memory-scope';
import {
	canContinueSystemThread,
	canContinueThreadInPreview,
	chatSurfaceMemoryResourceId,
	N8N_CHAT_PRODUCTION_SOURCE,
	threadBelongsTo,
	type AgentChatSurface,
} from './utils/agent-thread-access';
import { getDelegatedChildCheckpoints } from './utils/delegated-child-checkpoints';

type CancelExecutionPayload = PubSubCommandMap['cancel-agent-chat-execution'];
// In-process callers already know which chat surface a run is on. The wire
// payload also keeps the older `productionN8nChat` flag for rolling-deploy
// compatibility with mains still running the previous version.
type ExecutionContext = Omit<CancelExecutionPayload, 'productionN8nChat' | 'surface'> & {
	surface: AgentChatSurface;
	scope?: 'foreground' | 'all';
};

export interface CancelSuspendedRunParams {
	agentId: string;
	runId: string;
	resourceId: string;
	/** Foreground Stop leaves detached children running. */
	cancelBackgroundJobs?: boolean;
}

export { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';

@Service()
export class AgentChatExecutionService {
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
		private readonly backgroundJobService: AgentBackgroundJobService,
	) {}

	/** Register each execution under this lock before Stop can inspect its database row. */
	async withTurnLock<T>(threadId: string, action: (signal: AbortSignal) => Promise<T>): Promise<T> {
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-preview-turn:${threadId}`,
			action,
		);
	}

	register(context: ExecutionContext, controller: AbortController): void {
		this.executions.set(context.executionId, { context, controller });
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
			await this.withTurnLock(context.threadId, async () => {
				const latest = await this.executionRepository.findLatestByThreadId(context.threadId);
				if (latest?.id !== executionId) return;
				await this.cancelSuspended({
					agentId: context.agentId,
					runId: suspendedRunId,
					resourceId: chatSurfaceMemoryResourceId(context.surface, context.userId),
					cancelBackgroundJobs: execution.controller.signal.reason === PARENT_TASK_CANCELLED_REASON,
				});
			});
		} finally {
			this.executions.delete(executionId);
		}
	}

	async requestCancel(context: ExecutionContext): Promise<boolean> {
		return await this.withTurnLock(context.threadId, async () => {
			const execution = await this.getOwnedExecution(context);
			if (!execution) throw new NotFoundError('Execution not found');

			if (execution.status !== 'running') {
				const latest = await this.executionRepository.findLatestByThreadId(context.threadId);
				if (latest?.id !== context.executionId) return false;
			}

			try {
				await this.steering.close(context.threadId, context.executionId);
				if (this.cancelLocal(context)) return true;

				const running = execution.status === 'running';
				// Relay full cancellation even after the response ends.
				// Another main can still be saving a new background job.
				if (this.instanceSettings.isMultiMain && (running || context.scope !== 'foreground')) {
					const { surface, scope, ...rest } = context;
					await this.publisher.publishCommand({
						command:
							scope === 'foreground'
								? 'cancel-agent-chat-foreground'
								: 'cancel-agent-chat-execution',
						payload: { ...rest, surface, productionN8nChat: surface === 'n8n-chat' },
					});
				}

				return running || (await this.cancelRecordedSuspension(context));
			} finally {
				if (context.scope !== 'foreground')
					await this.backgroundJobService.cancelForParent(
						context.agentId,
						context.threadId,
						chatSurfaceMemoryResourceId(context.surface, context.userId),
					);
			}
		});
	}

	@OnPubSubEvent('cancel-agent-chat-execution', { instanceType: 'main' })
	async onCancelExecution(payload: CancelExecutionPayload): Promise<void> {
		await this.cancelExecution(payload, 'all');
	}

	@OnPubSubEvent('cancel-agent-chat-foreground', { instanceType: 'main' })
	async onCancelForegroundExecution(payload: CancelExecutionPayload): Promise<void> {
		await this.cancelExecution(payload, 'foreground');
	}

	private async cancelExecution(
		payload: CancelExecutionPayload,
		scope: NonNullable<ExecutionContext['scope']>,
	): Promise<void> {
		const { productionN8nChat, surface, ...rest } = payload;
		const context: ExecutionContext = {
			...rest,
			scope,
			surface: surface ?? (productionN8nChat ? 'n8n-chat' : 'preview'),
		};

		if (await this.cancelLocalWithChildren(context)) return;

		await this.withTurnLock(context.threadId, async () => {
			if (await this.cancelLocalWithChildren(context)) return;

			const execution = await this.getOwnedExecution(context);
			if (!execution) return;

			if (execution.status !== 'running') {
				const latest = await this.executionRepository.findLatestByThreadId(context.threadId);
				if (latest?.id !== context.executionId) return;
			}

			if (context.scope !== 'foreground') {
				await this.backgroundJobService.cancelForParent(
					context.agentId,
					context.threadId,
					chatSurfaceMemoryResourceId(context.surface, context.userId),
				);
			}

			await this.cancelRecordedSuspension(context);
		});
	}

	private async cancelLocalWithChildren(context: ExecutionContext): Promise<boolean> {
		if (!this.cancelLocal(context)) return false;
		if (context.scope === 'foreground') return true;

		await this.backgroundJobService.cancelForParent(
			context.agentId,
			context.threadId,
			chatSurfaceMemoryResourceId(context.surface, context.userId),
		);

		return true;
	}

	/** Abort an execution registered on this main instance. */
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

		execution.controller.abort(
			context.scope === 'foreground'
				? new DOMException('Response stopped', 'AbortError')
				: PARENT_TASK_CANCELLED_REASON,
		);

		return true;
	}

	private async getOwnedExecution(context: ExecutionContext) {
		const { threadId, projectId, agentId, userId, executionId } = context;
		const thread = await this.executionService.findThreadById(threadId);
		if (!thread || !threadBelongsTo(thread, projectId, agentId, userId)) return null;

		const execution = await this.executionRepository.findOneBy({ id: executionId, threadId });
		if (!execution || !this.canAccessExecution(context, thread, execution.source)) return null;
		return execution;
	}

	private canAccessExecution(
		context: ExecutionContext,
		thread: AgentExecutionThread,
		source: string | null,
	): boolean {
		switch (context.surface) {
			case 'n8n-chat':
				return (
					thread.accessScope === 'user' &&
					thread.ownerId === context.userId &&
					source === N8N_CHAT_PRODUCTION_SOURCE
				);
			case 'system':
				return canContinueSystemThread(thread, context.userId, source);
			case 'preview':
				return canContinueThreadInPreview(thread, context.userId, source);
		}
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
			cancelBackgroundJobs: context.scope !== 'foreground',
			resourceId: chatSurfaceMemoryResourceId(context.surface, context.userId),
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
		const productionUserId = userIdFromProductionChatMemoryResourceId(params.resourceId);
		const userId =
			userIdFromDraftChatMemoryResourceId(params.resourceId) ??
			userIdFromSystemChatMemoryResourceId(params.resourceId) ??
			productionUserId;
		if (
			productionUserId &&
			(!thread ||
				!(await this.executionService.canUseProductionChatThread(
					thread.id,
					thread.projectId,
					params.agentId,
					productionUserId,
					'existing',
				)))
		)
			return false;

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

		if (params.cancelBackgroundJobs !== false) {
			await this.backgroundJobService.cancelForParent(
				params.agentId,
				checkpoint.persistence.threadId,
				params.resourceId,
			);
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
