import { Logger } from '@n8n/backend-common';
import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AppArtifactService } from '../app-artifact.service';
import { AppRetentionService } from '../app-retention.service';
import { appStorageLockSubKey } from '../app-storage-lock';
import { AppStorageCleanupTask } from '../app-storage-cleanup.task';
import { AppVersionRepository } from '../app-version.repository';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';
import { AppSourceVersionStore, AppBuildResultStore } from '../storage/app-version-stores';

function createRetention() {
	const ctx = mock<OperationContext>();
	const apps = mock<AppRepository>();
	const versions = mock<AppVersionRepository>();
	const sourceVersions = mock<AppSourceVersionStore>();
	const buildResults = mock<AppBuildResultStore>();
	const config = mock<AppsConfig>({ maxVersionsPerApp: 2, maxBundlesPerApp: 3 });
	const locks = mock<DbLockService>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
	apps.findById.mockResolvedValue(mock<App>({ draftVersionId: null, publishedVersionId: null }));
	const retention = new AppRetentionService(
		apps,
		versions,
		config,
		locks,
		sourceVersions,
		buildResults,
	);
	return { retention, ctx, apps, versions, sourceVersions, buildResults, config, locks };
}

describe('AppRetentionService', () => {
	it('keeps protected history and prunes through the stores in the same transaction', async () => {
		const { retention, ctx, apps, versions, sourceVersions, buildResults, locks } =
			createRetention();
		apps.findById.mockResolvedValue(
			mock<App>({ draftVersionId: 'draft', publishedVersionId: 'published-bundle' }),
		);
		versions.listForRetention.mockResolvedValue([
			{ id: 'draft', buildStatus: 'failed', hasBundle: false },
			{ id: 'queued', buildStatus: 'queued', hasBundle: false },
			{ id: 'running', buildStatus: 'running', hasBundle: false },
			{ id: 'latest-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'recent-source', buildStatus: 'failed', hasBundle: false },
			{ id: 'retained-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'published-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'old-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'old-source', buildStatus: 'failed', hasBundle: false },
		]);

		await retention.prune('app');

		expect(locks.withLockContext).toHaveBeenCalledExactlyOnceWith(
			DbLock.APPS_STORAGE,
			expect.any(Function),
			{ subKey: appStorageLockSubKey('app') },
		);
		expect(versions.listForRetention).toHaveBeenCalledExactlyOnceWith('app', ctx);
		expect(buildResults.removeBundles).toHaveBeenCalledExactlyOnceWith(['old-bundle'], ctx);
		expect(sourceVersions.removeVersions).toHaveBeenCalledExactlyOnceWith(
			['old-source', 'old-bundle', 'recent-source'],
			ctx,
		);
	});

	it('keeps the latest bundle when protected bundles exceed the limit', async () => {
		const { retention, ctx, apps, versions, sourceVersions, buildResults, config } =
			createRetention();
		config.maxBundlesPerApp = 1;
		apps.findById.mockResolvedValue(
			mock<App>({ draftVersionId: 'draft-bundle', publishedVersionId: 'published-bundle' }),
		);
		versions.listForRetention.mockResolvedValue([
			{ id: 'latest-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'draft-bundle', buildStatus: 'succeeded', hasBundle: true },
			{ id: 'published-bundle', buildStatus: 'succeeded', hasBundle: true },
		]);

		await retention.prune('app');

		expect(buildResults.removeBundles).toHaveBeenCalledExactlyOnceWith([], ctx);
		expect(sourceVersions.removeVersions).toHaveBeenCalledExactlyOnceWith([], ctx);
	});

	it('keeps the newest unprotected versions within the limit', async () => {
		const { retention, ctx, versions, sourceVersions } = createRetention();
		versions.listForRetention.mockResolvedValue([
			{ id: 'newest', buildStatus: 'failed', hasBundle: false },
			{ id: 'middle', buildStatus: 'failed', hasBundle: false },
			{ id: 'oldest', buildStatus: 'failed', hasBundle: false },
		]);

		await retention.prune('app');

		expect(sourceVersions.removeVersions).toHaveBeenCalledExactlyOnceWith(['oldest'], ctx);
	});

	it('skips an app deleted before retention starts', async () => {
		const { retention, apps, sourceVersions, buildResults } = createRetention();
		apps.findById.mockResolvedValue(null);

		await retention.prune('app');

		expect(sourceVersions.removeVersions).not.toHaveBeenCalled();
		expect(buildResults.removeBundles).not.toHaveBeenCalled();
	});
});

describe('AppStorageCleanupTask', () => {
	it('reclaims artifacts once after pruning apps across all pages', async () => {
		const { retention, ctx, apps, versions, sourceVersions } = createRetention();
		const artifacts = mock<AppArtifactService>();
		const task = new AppStorageCleanupTask(apps, retention, artifacts, mock<Logger>());
		const signal = new AbortController().signal;
		apps.listIdsAfter
			.mockResolvedValueOnce(['app-1'])
			.mockResolvedValueOnce(['app-2'])
			.mockResolvedValueOnce([]);
		versions.listForRetention.mockImplementation(async (appId) => [
			{ id: `${appId}-newest`, buildStatus: 'failed', hasBundle: false },
			{ id: `${appId}-middle`, buildStatus: 'failed', hasBundle: false },
			{ id: `${appId}-oldest`, buildStatus: 'failed', hasBundle: false },
		]);
		artifacts.cleanup.mockImplementation(async () => {
			expect(sourceVersions.removeVersions).toHaveBeenCalledTimes(2);
		});

		await task.run(signal);

		expect(apps.listIdsAfter.mock.calls).toEqual([[undefined], ['app-1'], ['app-2']]);
		expect(sourceVersions.removeVersions.mock.calls).toEqual([
			[['app-1-oldest'], ctx],
			[['app-2-oldest'], ctx],
		]);
		expect(artifacts.cleanup).toHaveBeenCalledExactlyOnceWith(signal);
	});

	it('continues pruning apps and reclaims artifacts after a prune fails', async () => {
		const apps = mock<AppRepository>();
		const retention = mock<AppRetentionService>();
		const artifacts = mock<AppArtifactService>();
		const logger = mock<Logger>();
		const task = new AppStorageCleanupTask(apps, retention, artifacts, logger);
		const signal = new AbortController().signal;
		const error = new Error('Prune failed');
		apps.listIdsAfter.mockResolvedValueOnce(['app-1', 'app-2']).mockResolvedValueOnce([]);
		retention.prune.mockRejectedValueOnce(error);

		await task.run(signal);

		expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Could not prune app history.', {
			appId: 'app-1',
			error,
		});
		expect(retention.prune.mock.calls).toEqual([
			['app-1', signal],
			['app-2', signal],
		]);
		expect(artifacts.cleanup).toHaveBeenCalledExactlyOnceWith(signal);
	});

	it('stops cleanup when pruning is aborted', async () => {
		const apps = mock<AppRepository>();
		const retention = mock<AppRetentionService>();
		const artifacts = mock<AppArtifactService>();
		const task = new AppStorageCleanupTask(apps, retention, artifacts, mock<Logger>());
		const controller = new AbortController();
		apps.listIdsAfter.mockResolvedValueOnce(['app-1', 'app-2']);
		retention.prune.mockImplementationOnce(async () => {
			controller.abort();
			controller.signal.throwIfAborted();
		});

		await expect(task.run(controller.signal)).rejects.toThrow('aborted');

		expect(retention.prune).toHaveBeenCalledExactlyOnceWith('app-1', controller.signal);
		expect(artifacts.cleanup).not.toHaveBeenCalled();
	});
});
