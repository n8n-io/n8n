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

/**
 * Entries never expire: the publication applier owns their full lifecycle and
 * rebuilds them on every leader startup/takeover, so a TTL would only risk
 * silently disabling the cache for a workflow that is not republished.
 */
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
	 * Resolves a workflow's published version: returns the workflow entity and the
	 * `WorkflowHistory` row that the `workflow_published_version` mapping currently
	 * points at, or `null` when there is no published version.
	 *
	 * The cache is not written on a miss; workflow publication is responsible for
	 * populating the cache (see {@link refresh}).
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const cached = await this.cacheService.get<PublishedWorkflowData>(cacheKey(workflowId));
		if (cached) return cached;

		return await this.loadFromDb(workflowId);
	}

	/**
	 * Drops the cached entry. Called by the publication applier before it changes
	 * the published version, so reads fall through to the database for the brief
	 * window until {@link refresh} repopulates it.
	 *
	 * Best-effort: the cache is an optimization, never a correctness dependency of
	 * publication, so a failure is logged and swallowed.
	 */
	async invalidate(workflowId: string): Promise<void> {
		try {
			await this.cacheService.delete(cacheKey(workflowId));
		} catch (error) {
			this.logger.warn('Failed to invalidate published-version cache', {
				workflowId,
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * Rebuilds the cached entry from current database state. Called by the
	 * publication applier after it has advanced the published version. Best-effort
	 * like {@link invalidate}; on failure the entry is dropped so reads fall
	 * through to the database rather than serving a stale version.
	 */
	async refresh(workflowId: string): Promise<void> {
		const key = cacheKey(workflowId);
		try {
			// Reload rather than caching the applier's in-hand data: this is the same
			// query the read path uses, so the cached value carries the workflow's
			// shared/project relations and matches a cache-miss result exactly.
			const data = await this.loadFromDb(workflowId);
			if (data) await this.cacheService.set(key, data, NO_EXPIRY);
			else await this.cacheService.delete(key);
		} catch (error) {
			this.logger.warn('Failed to refresh published-version cache', {
				workflowId,
				error: ensureError(error).message,
			});
			await this.cacheService.delete(key).catch(() => {});
		}
	}

	private async loadFromDb(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}
}
