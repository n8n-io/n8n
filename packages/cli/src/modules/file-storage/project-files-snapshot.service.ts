import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { ProjectFilesSnapshotEntry } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import { ProjectFileRepository } from './project-file.repository';

/**
 * Kept short: mutations invalidate explicitly, so the TTL only bounds
 * staleness that invalidation cannot see (per-instance memory caches on
 * other mains/workers, invalidation racing an uncommitted transfer).
 */
const SNAPSHOT_TTL_MS = 10 * Time.seconds.toMilliseconds;

const cacheKey = (projectId: string) => `project-files:snapshot:${projectId}`;

/**
 * The per-execution metadata snapshot backing the `$files` expression: one
 * indexed query for the project's file rows — no bytes — cached briefly
 * because `getBase()` loads it unconditionally for every execution, the way
 * `$vars` loads through `VariablesService.getAllCached`.
 */
@Service()
export class ProjectFilesSnapshotService {
	constructor(
		private readonly repository: ProjectFileRepository,
		private readonly cacheService: CacheService,
	) {}

	async getSnapshot(projectId: string): Promise<ProjectFilesSnapshotEntry[]> {
		const key = cacheKey(projectId);

		const cached = await this.cacheService.get<ProjectFilesSnapshotEntry[]>(key);
		if (cached !== undefined) return cached;

		const files = await this.repository.findAllByProjectId(projectId);
		// Dates normalize to ISO strings so a snapshot round-tripped through a
		// serializing cache backend is indistinguishable from a fresh one.
		const snapshot: ProjectFilesSnapshotEntry[] = files.map((file) => ({
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			size: file.fileSizeBytes,
			updatedAt: file.updatedAt.toISOString(),
		}));

		await this.cacheService.set(key, snapshot, SNAPSHOT_TTL_MS);

		return snapshot;
	}

	/** Called by `ProjectFileService` after every mutation of a project's files. */
	async invalidateSnapshot(projectId: string): Promise<void> {
		await this.cacheService.delete(cacheKey(projectId));
	}
}
