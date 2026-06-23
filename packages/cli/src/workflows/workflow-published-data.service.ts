import {
	WorkflowPublishedVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';

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
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly cacheService: CacheService,
	) {}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and the
	 * `WorkflowHistory` row that the `workflow_published_version` mapping currently
	 * points at, or `null` when there is no published version.
	 *
	 * We read from the cache if it's present, else the database. The cache is not
	 * written on a miss; workflow publication is responsible for populating it
	 * (see {@link refreshCache}).
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const cached = await this.cacheService.get<PublishedWorkflowData>(cacheKey(workflowId));
		return cached ? cached : await this.loadFromDb(workflowId);
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
	 * Repopulates the cached entry from current database state, after the applier
	 * has advanced the published version. Reloads via the same query the read path
	 * uses, so the cached value carries the workflow's shared/project relations and
	 * matches a cache-miss result exactly.
	 *
	 * A failure propagates so the record is retried rather than left with a cold
	 * cache until the next publication.
	 */
	async refreshCache(workflowId: string): Promise<void> {
		const key = cacheKey(workflowId);
		const data = await this.loadFromDb(workflowId);
		if (data) await this.cacheService.set(key, data, NO_EXPIRY);
		else await this.cacheService.delete(key);
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
