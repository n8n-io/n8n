import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublishedVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

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
	 *
	 * This is the default read, used by every on-demand execution path (webhooks,
	 * sub-workflow, error workflow, MCP) that loads fresh today. The in-memory
	 * trigger path opts into {@link getCachedPublishedWorkflowData} instead.
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}

	/**
	 * Cached variant for the in-memory (non-webhook) trigger path. The entry is
	 * refreshed only when a new version is published (see {@link refreshCache}),
	 * mirroring how registered triggers hold their definition in memory today.
	 *
	 * Falls back to {@link getPublishedWorkflowData} on a miss or a cache outage —
	 * the cache is only an optimization and must never fail resolution.
	 */
	async getCachedPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		try {
			const cached = await this.cacheService.get<PublishedWorkflowData>(cacheKey(workflowId));
			if (cached) return cached;
		} catch (error) {
			this.logger.warn('Failed to read published-version cache; falling back to the database', {
				workflowId,
				error: ensureError(error).message,
			});
		}
		return await this.getPublishedWorkflowData(workflowId);
	}

	/**
	 * Drops the cached entry. Called by the publication applier before it advances
	 * the published version, so reads fall through to the database until
	 * {@link refreshCache} repopulates it.
	 *
	 * A failure propagates: entries never expire, so if we cannot clear a stale
	 * entry we must not let publication advance the database, or the two would
	 * disagree indefinitely. Failing here instead leaves the record to be retried.
	 */
	async invalidateCache(workflowId: string): Promise<void> {
		await this.cacheService.delete(cacheKey(workflowId));
	}

	/**
	 * Repopulates the cached entry from current database state, so the trigger path
	 * serves the newly published version. Reuses {@link getPublishedWorkflowData}
	 * so the cached value matches a fresh read exactly.
	 */
	async refreshCache(workflowId: string): Promise<void> {
		const key = cacheKey(workflowId);
		const data = await this.getPublishedWorkflowData(workflowId);
		if (data) {
			await this.cacheService.set(key, data, NO_EXPIRY);
		} else {
			await this.cacheService.delete(key);
		}
	}
}
