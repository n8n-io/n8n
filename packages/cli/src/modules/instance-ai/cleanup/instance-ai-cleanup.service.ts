import type { Logger } from '@n8n/backend-common';
import type { AiBuilderTemporaryWorkflowRepository, User, UserRepository } from '@n8n/db';
import type { BackgroundTaskManager } from '@n8n/instance-ai';

import type { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';
import type { TypeORMCompositeStore } from '../storage/typeorm-composite-store';
import type { TypeORMWorkflowsStorage } from '../storage/typeorm-workflows-storage';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class InstanceAiCleanupService {
	constructor(
		private readonly deps: {
			backgroundTasks: Pick<BackgroundTaskManager, 'getRunningTasks'>;
			aiBuilderTemporaryWorkflowRepository: Pick<
				AiBuilderTemporaryWorkflowRepository,
				'findByThread'
			>;
			adapterService: Pick<InstanceAiAdapterService, 'createContext'>;
			threadRepo: Pick<InstanceAiThreadRepository, 'findOneBy'>;
			userRepository: Pick<UserRepository, 'findOneBy'>;
			compositeStore: TypeORMCompositeStore;
			logger: Pick<Logger, 'debug' | 'warn'>;
		},
	) {}

	async reapAiTemporaryFromRun(
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
	): Promise<string[]> {
		const runningTaskCount = this.deps.backgroundTasks.getRunningTasks(threadId).length;
		if (runningTaskCount > 0) {
			this.deps.logger.debug('Deferring AI-builder temporary workflow cleanup until tasks settle', {
				threadId,
				runningTaskCount,
			});
			return [];
		}

		let markedWorkflows: Array<{ workflowId: string }> = [];
		try {
			markedWorkflows = await this.deps.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.deps.logger.warn('Failed to inspect AI-builder temporary workflows during run finish', {
				threadId,
				error: getErrorMessage(error),
			});
		}
		const workflowIds = new Set([
			...markedWorkflows.map(({ workflowId }) => workflowId),
			...(createdWorkflowIds ?? []),
		]);
		if (workflowIds.size === 0) return [];

		return await this.archiveAiTemporaryWorkflows(threadId, user, workflowIds);
	}

	async reapAiTemporaryForThreadCleanup(threadId: string): Promise<void> {
		let markedWorkflows: Array<{ workflowId: string }>;
		try {
			markedWorkflows = await this.deps.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.deps.logger.warn(
				'Failed to inspect AI-builder temporary workflows during thread cleanup',
				{
					threadId,
					error: getErrorMessage(error),
				},
			);
			return;
		}

		if (markedWorkflows.length === 0) return;

		let thread: Awaited<ReturnType<InstanceAiThreadRepository['findOneBy']>>;
		try {
			thread = await this.deps.threadRepo.findOneBy({ id: threadId });
		} catch (error) {
			this.deps.logger.warn(
				'Failed to load thread owner for AI-builder temporary workflow cleanup',
				{
					threadId,
					markedWorkflowCount: markedWorkflows.length,
					error: getErrorMessage(error),
				},
			);
			return;
		}
		if (!thread?.resourceId) {
			this.deps.logger.warn(
				'Skipping AI-builder temporary workflow cleanup for thread without owner',
				{
					threadId,
					markedWorkflowCount: markedWorkflows.length,
				},
			);
			return;
		}

		let user: User | null;
		try {
			user = await this.deps.userRepository.findOneBy({ id: thread.resourceId });
		} catch (error) {
			this.deps.logger.warn('Failed to load user for AI-builder temporary workflow cleanup', {
				threadId,
				userId: thread.resourceId,
				markedWorkflowCount: markedWorkflows.length,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!user) {
			this.deps.logger.warn(
				'Skipping AI-builder temporary workflow cleanup for missing thread owner',
				{
					threadId,
					userId: thread.resourceId,
					markedWorkflowCount: markedWorkflows.length,
				},
			);
			return;
		}

		await this.archiveAiTemporaryWorkflows(
			threadId,
			user,
			new Set(markedWorkflows.map(({ workflowId }) => workflowId)),
		);
	}

	async cleanupMastraSnapshots(mastraRunId: string): Promise<void> {
		try {
			const workflowsStorage = this.deps.compositeStore.stores.workflows as TypeORMWorkflowsStorage;
			await workflowsStorage.deleteAllByRunId(mastraRunId);
		} catch (error) {
			this.deps.logger.warn('Failed to clean up Mastra workflow snapshots', {
				mastraRunId,
				error: getErrorMessage(error),
			});
		}
	}

	private async archiveAiTemporaryWorkflows(
		threadId: string,
		user: User,
		workflowIds: Set<string>,
	): Promise<string[]> {
		const adapter = this.deps.adapterService.createContext(user, { threadId });
		const archived: string[] = [];
		for (const workflowId of workflowIds) {
			try {
				const didArchive = await adapter.workflowService.archiveIfAiTemporary(workflowId);
				if (didArchive) archived.push(workflowId);
			} catch (error) {
				this.deps.logger.warn('Failed to reap AI-builder temporary workflow', {
					threadId,
					workflowId,
					error: getErrorMessage(error),
				});
			}
		}
		return archived;
	}
}
