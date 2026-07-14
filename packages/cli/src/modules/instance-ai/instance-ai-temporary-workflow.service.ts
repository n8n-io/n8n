import { Logger } from '@n8n/backend-common';
import { AiBuilderTemporaryWorkflowRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Owns the lifecycle of the throwaway workflows the AI builder creates while
 * working a thread. The orchestrator tags scratch/chunk/sub-workflows with the
 * AI-builder temporary marker and clears it from the main deliverable before a
 * run finishes, so anything still marked when a run or thread settles is a
 * stepping-stone the user never sees in their workflows list. This service
 * archives those leftovers (soft delete — a mistaken reap is recoverable from
 * the archive view) on three occasions:
 *
 *   - when a run finishes ({@link reapForRun}), folding in any workflows the
 *     run created so far and returning the archived ids for the run-finish
 *     event payload;
 *   - when a cancelled/suspended run finalizes (also {@link reapForRun}); and
 *   - when a thread is cleared ({@link reapForThreadCleanup}), where the thread
 *     owner has to be resolved before the archive can run.
 *
 * All archiving is best-effort: individual failures are logged and never block
 * the caller's own work.
 */
@Service()
export class InstanceAiTemporaryWorkflowService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly userRepository: UserRepository,
		private readonly aiBuilderTemporaryWorkflowRepository: AiBuilderTemporaryWorkflowRepository,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Archive the temporary workflows tied to a finishing run and return their
	 * ids so the caller can pass them on in the run-finish event. Defers when
	 * background tasks are still running for the thread, since they may still be
	 * relying on those workflows.
	 */
	async reapForRun(
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
		runningTaskCount: number,
	): Promise<string[]> {
		if (runningTaskCount > 0) {
			this.logger.debug('Deferring AI-builder temporary workflow cleanup until tasks settle', {
				threadId,
				runningTaskCount,
			});
			return [];
		}

		let markedWorkflows: Array<{ workflowId: string }> = [];
		try {
			markedWorkflows = await this.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to inspect AI-builder temporary workflows during run finish', {
				threadId,
				error: getErrorMessage(error),
			});
		}
		const workflowIds = new Set([
			...markedWorkflows.map(({ workflowId }) => workflowId),
			...(createdWorkflowIds ?? []),
		]);
		if (workflowIds.size === 0) return [];

		return await this.archive(threadId, user, workflowIds);
	}

	/**
	 * Archive the temporary workflows left behind by a thread being cleared.
	 * Resolves the thread owner first, since there is no in-flight run to supply
	 * the acting user.
	 */
	async reapForThreadCleanup(threadId: string): Promise<void> {
		let markedWorkflows: Array<{ workflowId: string }>;
		try {
			markedWorkflows = await this.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to inspect AI-builder temporary workflows during thread cleanup', {
				threadId,
				error: getErrorMessage(error),
			});
			return;
		}

		if (markedWorkflows.length === 0) return;

		let thread: Awaited<ReturnType<InstanceAiThreadRepository['findOneBy']>>;
		try {
			thread = await this.threadRepo.findOneBy({ id: threadId });
		} catch (error) {
			this.logger.warn('Failed to load thread owner for AI-builder temporary workflow cleanup', {
				threadId,
				markedWorkflowCount: markedWorkflows.length,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!thread?.resourceId) {
			this.logger.warn('Skipping AI-builder temporary workflow cleanup for thread without owner', {
				threadId,
				markedWorkflowCount: markedWorkflows.length,
			});
			return;
		}

		let user: User | null;
		try {
			user = await this.userRepository.findOneBy({ id: thread.resourceId });
		} catch (error) {
			this.logger.warn('Failed to load user for AI-builder temporary workflow cleanup', {
				threadId,
				userId: thread.resourceId,
				markedWorkflowCount: markedWorkflows.length,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!user) {
			this.logger.warn('Skipping AI-builder temporary workflow cleanup for missing thread owner', {
				threadId,
				userId: thread.resourceId,
				markedWorkflowCount: markedWorkflows.length,
			});
			return;
		}

		await this.archive(
			threadId,
			user,
			new Set(markedWorkflows.map(({ workflowId }) => workflowId)),
		);
	}

	private async archive(threadId: string, user: User, workflowIds: Set<string>): Promise<string[]> {
		const configEvalsEnabled = await this.adapterService.isConfigEvalsEnabled(user);
		const adapter = this.adapterService.createContext(user, { threadId, configEvalsEnabled });
		const archived: string[] = [];
		for (const workflowId of workflowIds) {
			try {
				const didArchive = await adapter.workflowService.archiveIfAiTemporary(workflowId);
				if (didArchive) archived.push(workflowId);
			} catch (error) {
				this.logger.warn('Failed to reap AI-builder temporary workflow', {
					threadId,
					workflowId,
					error: getErrorMessage(error),
				});
			}
		}
		return archived;
	}
}
