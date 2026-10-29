import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { toSaveSettings } from './to-save-settings';

/**
 * Remembers who started a manual execution that n8n does not save. Only that user can
 * read the execution after it finishes, until pruning hard-deletes it.
 *
 * The cache entry lasts one hard-delete buffer, like the soft-deleted execution. Losing
 * it, for example when a regular-mode instance restarts, only makes the execution
 * unreadable.
 */
@Service()
export class UnsavedManualExecutionService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly logger: Logger,
	) {}

	/**
	 * Records the user who starts a new manual execution that n8n will not save. Recorded
	 * at start, because a resumed run may act as a different user.
	 *
	 * Only for a run that a browser shows, which has a `pushRef`. n8n also starts manual
	 * runs without one, for example to fetch an evaluation dataset, and does not keep them.
	 */
	async recordStarter(
		executionId: string,
		data: Pick<
			IWorkflowExecutionDataProcess,
			'executionMode' | 'workflowData' | 'userId' | 'pushRef'
		>,
	): Promise<void> {
		if (data.executionMode !== 'manual' || !data.userId || !data.pushRef) return;
		if (!this.isEnabled() || toSaveSettings(data.workflowData.settings).manual) return;

		await this.writeStarter(executionId, data.userId);
	}

	/**
	 * Restarts the buffer when n8n soft-deletes the finished execution, so that the entry
	 * lasts as long as the execution.
	 *
	 * @returns whether a user can read the execution until pruning hard-deletes it.
	 */
	async keep(executionId: string): Promise<boolean> {
		const starter = this.isEnabled() ? await this.readStarter(executionId) : undefined;
		return starter ? await this.writeStarter(executionId, starter) : false;
	}

	/** Whether `userId` started this unsaved manual execution and can still read it. */
	async isStarter(executionId: string, userId: string): Promise<boolean> {
		return this.isEnabled() && (await this.readStarter(executionId)) === userId;
	}

	/**
	 * Only while pruning hard-deletes soft-deleted executions after a buffer, which
	 * bounds how long n8n keeps them.
	 */
	private isEnabled() {
		const { pruneData, pruneDataHardDeleteBuffer } = this.executionsConfig;
		return pruneData && pruneDataHardDeleteBuffer > 0;
	}

	/** The memory cache cannot change a TTL, so a refresh writes the entry again. */
	private async writeStarter(executionId: string, userId: string): Promise<boolean> {
		const ttl = this.executionsConfig.pruneDataHardDeleteBuffer * Time.hours.toMilliseconds;
		try {
			await this.cacheService.set(toCacheKey(executionId), userId, ttl);
			return true;
		} catch (error) {
			this.logger.warn('Failed to record the starter of an unsaved manual execution', {
				executionId,
				error: ensureError(error),
			});
			return false;
		}
	}

	private async readStarter(executionId: string): Promise<string | undefined> {
		try {
			const starter = await this.cacheService.get(toCacheKey(executionId));
			return typeof starter === 'string' ? starter : undefined;
		} catch (error) {
			this.logger.warn('Failed to read the starter of an unsaved manual execution', {
				executionId,
				error: ensureError(error),
			});
			return undefined;
		}
	}
}

const toCacheKey = (executionId: string) => `unsaved-manual-execution:${executionId}`;
