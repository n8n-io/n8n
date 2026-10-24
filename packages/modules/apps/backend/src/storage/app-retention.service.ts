import { Logger } from '@n8n/backend-common';
import { DbLock, DbLockService } from '@n8n/db';
import { Service } from '@n8n/di';

import { appStorageLockSubKey } from './app-storage-lock';
import { AppVersionRepository } from '../versions/app-version.repository';
import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';
import { AppSourceVersionStore, AppBuildResultStore } from './app-version-stores';

@Service()
export class AppRetentionService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly config: AppsConfig,
		private readonly locks: DbLockService,
		private readonly sourceVersions: AppSourceVersionStore,
		private readonly buildResults: AppBuildResultStore,
		private readonly logger: Logger,
	) {}

	async prune(appId: string, signal?: AbortSignal): Promise<void> {
		signal?.throwIfAborted();
		const pruned = await this.locks.withLockContext(
			DbLock.APPS_STORAGE,
			async (ctx) => {
				const app = await this.apps.findById(appId, ctx);
				if (!app) return;
				const versions = await this.versions.listForRetention(appId, ctx);
				const protectedIds = new Set([app.draftVersionId, app.publishedVersionId]);
				for (const version of versions) {
					if (version.buildStatus === 'queued' || version.buildStatus === 'running')
						protectedIds.add(version.id);
				}
				const built = versions.filter((version) => version.hasBundle);
				if (built[0]) protectedIds.add(built[0].id);

				const bundlesToRemove = this.oldestExcess(
					built.map(({ id }) => id),
					protectedIds,
					this.config.maxBundlesPerApp,
				);
				await this.buildResults.removeBundles(bundlesToRemove, ctx);
				const removedBundles = new Set(bundlesToRemove);
				for (const version of built) {
					if (!removedBundles.has(version.id)) protectedIds.add(version.id);
				}
				const versionsToRemove = this.oldestExcess(
					versions.map(({ id }) => id),
					protectedIds,
					this.config.maxVersionsPerApp,
				);
				await this.sourceVersions.removeVersions(versionsToRemove, ctx);
				return {
					removedVersions: versionsToRemove.length,
					removedBundles: bundlesToRemove.length,
				};
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
		if (pruned && (pruned.removedVersions > 0 || pruned.removedBundles > 0)) {
			this.logger.debug('Pruned app history.', { appId, ...pruned });
		}
	}

	private oldestExcess(
		newestFirst: string[],
		protectedIds: ReadonlySet<string | null>,
		limit: number,
	): string[] {
		const keep = new Set(newestFirst.filter((id) => protectedIds.has(id)));
		const remove: string[] = [];
		for (const id of newestFirst) {
			if (keep.has(id)) continue;
			if (keep.size < limit) keep.add(id);
			else remove.push(id);
		}
		return remove.reverse();
	}
}
