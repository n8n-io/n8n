import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import { mock } from 'vitest-mock-extended';

import { AppsModule } from '../apps.module';
import { AppsConfig } from '../apps.config';
import { AppProtectedResource } from '../auth/app-protected-resource';
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
		const config = Container.get(AppsConfig);
		config.baseUrl = 'https://apps.example.com';
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const registry = mock<ProtectedResourceRegistry>();
		const resource = mock<AppProtectedResource>();
		Container.set(ProtectedResourceRegistry, registry);
		Container.set(AppProtectedResource, resource);
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
		expect(registry.registerResolver).toHaveBeenCalledWith(resource);
		expect((await module.systemTasks()).map((task) => task.name)).toEqual([
			'AppStorageCleanupTask',
			'AppBuildReconciliationTask',
		]);
		expect(logger.warn).toHaveBeenCalledWith('The apps module is experimental.');
		expect(await module.settings()).toEqual({ enabled: true });
	});

	it('rejects missing hosting configuration before initializing storage', async () => {
		const config = Container.get(AppsConfig);
		config.baseUrl = '';
		const blobs = mock<AppBlobStore>();
		Container.set(AppBlobStore, blobs);
		await expect(new AppsModule().init()).rejects.toThrow('Set N8N_APPS_BASE_URL');
		expect(blobs.init).not.toHaveBeenCalled();
	});
});
