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
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Cached resolution of a workflow's published version, for the in-memory
	 * (non-webhook) trigger path. The entry is refreshed only when a new version
	 * is published, mirroring how registered triggers hold their definition in
	 * memory today.
	 *
	 * We read from the cache if it's present, else the database. The cache is not
	 * written on a miss; workflow publication is responsible for populating it
	 * (see {@link refreshCache}). On-demand execution paths (webhooks, sub-workflow,
	 * error workflow, MCP) must read fresh from the database via
	 * {@link getPublishedWorkflowDataFromDb} instead.
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const cached = await this.readFromCache(workflowId);
		return cached ?? (await this.getPublishedWorkflowDataFromDb(workflowId));
	}

	/**
	 * Uncached resolution straight from the database. Used by on-demand execution
	 * paths that load the workflow fresh today (webhooks, sub-workflow, error
	 * workflow, MCP), so they never serve stale `staticData` or relations.
	 */
	async getPublishedWorkflowDataFromDb(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
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
	 * Repopulates the cached entry from current database state.
	 *
	 * Reloads via the same query the read path uses, so the cached value carries
	 * the workflow's shared/project relations and matches a cache-miss result exactly.
	 */
	async refreshCache(workflowId: string): Promise<void> {
		const key = cacheKey(workflowId);
		const data = await this.getPublishedWorkflowDataFromDb(workflowId);
		if (data) {
			await this.cacheService.set(key, data, NO_EXPIRY);
		} else {
			await this.cacheService.delete(key);
		}
	}

	/**
	 * Reads the cached entry, degrading to a miss if the cache is unavailable.
	 * This runs on the hot trigger path, so a transient cache outage must fall
	 * through to the database rather than fail published-workflow resolution —
	 * the cache is only an optimization on top of the source of truth.
	 */
	private async readFromCache(workflowId: string): Promise<PublishedWorkflowData | undefined> {
		try {
			return await this.cacheService.get<PublishedWorkflowData>(cacheKey(workflowId));
		} catch (error) {
			this.logger.warn('Failed to read published-version cache; falling back to the database', {
				workflowId,
				error: ensureError(error).message,
			});
			return undefined;
		}
	}
}
