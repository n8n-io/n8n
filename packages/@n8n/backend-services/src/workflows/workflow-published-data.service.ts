import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublishedVersionRepository,
	type PublishedVersionForExecution,
	type PublishedWorkflowDataForExecution,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { WorkflowVersionedSettings } from './workflow-versioned-settings.service';
import { CacheService } from '../services/cache/cache.service';

export type { PublishedWorkflowDataForExecution };

export type PublishedWorkflowData = {
	workflow: WorkflowEntity;
	publishedVersion: WorkflowHistory;
};

const NO_EXPIRY = 0;

const cacheKey = (workflowId: string) => `workflow-published-data:${workflowId}`;

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly cacheService: CacheService,
		private readonly workflowVersionedSettings: WorkflowVersionedSettings,
	) {
		this.logger = this.logger.scoped('poll-trigger');
	}

	/**
	 * Resolves a workflow's published version from the database: the workflow
	 * entity and the `WorkflowHistory` row that the `workflow_published_version`
	 * mapping currently points at, or `null` when there is no published version.
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}

	async getPublishedWorkflowDataForExecution(
		workflowId: string,
	): Promise<PublishedWorkflowDataForExecution | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionForExecution(workflowId);
		return record && this.toRunData(record);
	}

	/**
	 * Get the published workflow data from the cache, falling back to the database if not found.
	 * The cache is not refreshed here on a miss. Only the publication applier should refresh the
	 * cache to ensure it never disagrees with the database. The cached value is a small execution
	 * payload, not a full WorkflowEntity with relations.
	 */
	async getCachedPublishedWorkflowDataForExecution(
		workflowId: string,
	): Promise<PublishedWorkflowDataForExecution | null> {
		try {
			const cached = await this.cacheService.get<PublishedVersionForExecution>(
				cacheKey(workflowId),
			);
			// An entry written before the cache held the version settings has no `versionSettings`.
			// It is still correct while version-scoped settings are off. The next publish replaces it.
			if (
				cached &&
				(cached.versionSettings !== undefined || !this.workflowVersionedSettings.isEnabled())
			) {
				return this.toRunData(cached);
			}
		} catch (error) {
			this.logger.warn('Failed to read published-version cache; falling back to the database', {
				workflowId,
				error: ensureError(error).message,
			});
		}
		return await this.getPublishedWorkflowDataForExecution(workflowId);
	}

	/**
	 * Drops the cached entry.
	 */
	async invalidateCache(workflowId: string): Promise<void> {
		await this.cacheService.delete(cacheKey(workflowId));
	}

	/**
	 * Repopulates the cached entry from current database state.
	 * If there is no published version, the cache entry is deleted.
	 * This should only be called by the publication applier to ensure the cache never disagrees with the database.
	 */
	async refreshCache(workflowId: string): Promise<void> {
		const key = cacheKey(workflowId);
		// The cache holds the record as stored. The settings are merged on read, so the
		// `engine-v2` module check is always current.
		const data =
			await this.workflowPublishedVersionRepository.getPublishedVersionForExecution(workflowId);
		if (data) {
			await this.cacheService.set(key, data, NO_EXPIRY);
		} else {
			await this.cacheService.delete(key);
		}
	}

	private toRunData({
		versionSettings,
		...data
	}: PublishedVersionForExecution): PublishedWorkflowDataForExecution {
		return {
			...data,
			settings: this.workflowVersionedSettings.forPublishedRun(data.settings, {
				settings: versionSettings,
			}),
		};
	}
}
