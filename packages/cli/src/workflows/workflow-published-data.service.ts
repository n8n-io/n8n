import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublishedVersionRepository,
	type PublishedWorkflowDataForExecution,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

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
		return await this.workflowPublishedVersionRepository.getPublishedVersionForExecution(
			workflowId,
		);
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
			const cached = await this.cacheService.get<PublishedWorkflowDataForExecution>(
				cacheKey(workflowId),
			);
			if (cached) return cached;
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
		const data = await this.getPublishedWorkflowDataForExecution(workflowId);
		if (data) {
			await this.cacheService.set(key, data, NO_EXPIRY);
		} else {
			await this.cacheService.delete(key);
		}
	}
}
