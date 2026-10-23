import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AppsModule } from '../apps.module';
import { AppBlobStore } from '../storage/app-blob-store';
import {
	SnapshotAppSourceVersionStore,
	SnapshotAppBuildResultStore,
} from '../storage/snapshot-app-version-stores';
import { AppSourceVersionStore, AppBuildResultStore } from '../storage/app-version-stores';

describe('AppsModule', () => {
	const moduleMetadata = Container.get(ModuleMetadata);

	afterEach(() => Container.reset());

	it('registers the module entrypoint', () => {
		expect(moduleMetadata.get('apps')?.class).toBe(AppsModule);
	});

	it('requires explicit module enablement', () => {
		const config = Container.get(ModulesConfig);
		config.enabledModules = [];
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('apps');
		config.enabledModules = ['apps'];
		expect(Container.get(ModuleRegistry).eligibleModules).toContain('apps');
	});

	it('exposes app entities and initializes with enabled settings', async () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const blobs = mock<AppBlobStore>();
		const sourceVersions = mock<SnapshotAppSourceVersionStore>();
		const buildResults = mock<SnapshotAppBuildResultStore>();
		Container.set(AppBlobStore, blobs);
		Container.set(SnapshotAppSourceVersionStore, sourceVersions);
		Container.set(SnapshotAppBuildResultStore, buildResults);
		const module = new AppsModule();
		expect((await module.entities()).map((entity) => entity.name)).toEqual([
			'App',
			'AppVersion',
			'AppArtifact',
		]);
		await module.init();
		expect(blobs.init).toHaveBeenCalledOnce();
		expect(Container.get(AppSourceVersionStore)).toBe(sourceVersions);
		expect(Container.get(AppBuildResultStore)).toBe(buildResults);
		expect((await module.systemTasks()).map((task) => task.name)).toEqual([
			'AppStorageCleanupTask',
		]);
		expect(logger.warn).toHaveBeenCalledWith('The apps module is experimental.');
		expect(await module.settings()).toEqual({ enabled: true });
	});
});
