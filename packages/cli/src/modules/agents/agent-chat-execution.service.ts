import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionService } from './agent-execution.service';
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

/**
 * Stop handling for Preview turns. The session lease admits the turns; the
 * checkpoint compare-and-set decides between cancelling a suspension and
 * resuming it.
 */
@Service()
export class AgentChatExecutionService {
	private readonly executions = new Map<
		string,
		{ context: ExecutionContext; controller: AbortController }
	>();

	constructor(
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionUpdates: AgentExecutionUpdateBroadcaster,
	) {}

	register(context: ExecutionContext, controller: AbortController): void {
		this.executions.set(context.executionId, { context, controller });
	}

	/**
	 * Cancels a suspension that the user stopped while the turn still holds the
	 * session lease, so that no resume can start in between. The Stop
	 * registration ends before `finalize` releases the lease: a later Stop uses
	 * the recorded state instead of aborting a turn that already ended.
	 */
	async settle(
		executionId: string,
		finalize: () => Promise<void>,
		suspendedRunId?: string,
	): Promise<void> {
		try {
			await this.cancelStoppedSuspension(executionId, suspendedRunId);
		} finally {
			this.executions.delete(executionId);
			await finalize();
		}
	}

	private async cancelStoppedSuspension(
		executionId: string,
		suspendedRunId?: string,
	): Promise<void> {
		const execution = this.executions.get(executionId);
		if (!execution?.controller.signal.aborted || !suspendedRunId) return;
		const { context } = execution;
		await this.cancelSuspended({
			agentId: context.agentId,
			runId: suspendedRunId,
			resourceId: draftChatMemoryResourceId(context.userId),
		});
	}

	async requestCancel(context: ExecutionContext): Promise<boolean> {
		const execution = await this.getOwnedExecution(context);
		if (!execution) throw new NotFoundError('Execution not found');
		if (this.cancelLocal(context)) return true;
		if (execution.status !== 'running') return await this.cancelRecordedSuspension(context);
		if (!this.instanceSettings.isMultiMain) return false;
		await this.publisher.publishCommand({
			command: 'cancel-agent-chat-execution',
			payload: context,
		});
		return true;
	}

	@OnPubSubEvent('cancel-agent-chat-execution', { instanceType: 'main' })
	async handleCancel(context: ExecutionContext): Promise<void> {
		if (this.cancelLocal(context)) return;
		if (await this.getOwnedExecution(context)) await this.cancelRecordedSuspension(context);
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
