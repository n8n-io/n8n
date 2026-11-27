import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import {
	OwnershipTransferHandlerRegistry,
	ProjectMutationHooksProxy,
	type ProjectMutationHooks,
	type ProjectOwnershipTransferHandler,
} from '@n8n/backend-services';
import { ProtectedResourceRegistry } from '@n8n/backend-services/auth';
import type { OperationContext } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AppsModule } from '../apps.module';
import { AppsConfig } from '../apps.config';
import { AppGrantRevocation } from '../auth/app-grant-revocation';
import { AppProtectedResource } from '../auth/app-protected-resource';
import {
	AppAgentPort,
	AppBindingAdapters,
	AppDataTablePort,
	AppWorkflowPort,
} from '../bindings/app-binding-ports';
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
		Container.set(AppGrantRevocation, mock<AppGrantRevocation>());
		const blobs = mock<AppBlobStore>();
		const sourceVersions = mock<SnapshotAppSourceVersionStore>();
		const buildResults = mock<SnapshotAppBuildResultStore>();
		Container.set(AppBlobStore, blobs);
		Container.set(SnapshotAppSourceVersionStore, sourceVersions);
		Container.set(SnapshotAppBuildResultStore, buildResults);
		const dataTables = mock<AppDataTablePort>();
		const workflows = mock<AppWorkflowPort>();
		const agents = mock<AppAgentPort>();
		const resolve = vi.fn(() => ({ dataTables, workflows, agents }));
		Container.set(AppBindingAdapters, { resolve });
		const module = new AppsModule();
		expect((await module.entities()).map((entity) => entity.name)).toEqual([
			'App',
			'AppVersion',
			'AppArtifact',
		]);
		expect(resolve).not.toHaveBeenCalled();
		await module.init();
		expect(Container.get(AppDataTablePort)).toBe(dataTables);
		expect(Container.get(AppWorkflowPort)).toBe(workflows);
		expect(Container.get(AppAgentPort)).toBe(agents);
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

	it('revokes app grants when a project or a user is deleted', async () => {
		const config = Container.get(AppsConfig);
		config.baseUrl = 'https://apps.example.com';
		Container.set(Logger, mock<Logger>());
		Container.set(ProtectedResourceRegistry, mock<ProtectedResourceRegistry>());
		Container.set(AppProtectedResource, mock<AppProtectedResource>());
		Container.set(AppBlobStore, mock<AppBlobStore>());
		Container.set(SnapshotAppSourceVersionStore, mock<SnapshotAppSourceVersionStore>());
		Container.set(SnapshotAppBuildResultStore, mock<SnapshotAppBuildResultStore>());
		Container.set(AppBindingAdapters, {
			resolve: () => ({
				dataTables: mock<AppDataTablePort>(),
				workflows: mock<AppWorkflowPort>(),
				agents: mock<AppAgentPort>(),
			}),
		});
		const grants = mock<AppGrantRevocation>();
		Container.set(AppGrantRevocation, grants);
		const hooks = mock<ProjectMutationHooksProxy>();
		Container.set(ProjectMutationHooksProxy, hooks);
		const transfers = mock<OwnershipTransferHandlerRegistry<unknown>>();
		Container.set(OwnershipTransferHandlerRegistry, transfers);
		const ctx = mock<OperationContext>();

		await new AppsModule().init();

		const [hookProvider]: [Partial<ProjectMutationHooks>] = hooks.registerProvider.mock.calls[0];
		await hookProvider.beforeProjectDeleted?.({ projectId: 'project-1', userId: 'user-1' }, ctx);
		expect(grants.revokeProject).toHaveBeenCalledExactlyOnceWith('project-1', ctx);

		const [handler]: [ProjectOwnershipTransferHandler<unknown>] = transfers.register.mock.calls[0];
		await handler.finalizeUserDeletion?.('user-1', 'personal-project-1', ctx);
		expect(grants.revokeProject).toHaveBeenLastCalledWith('personal-project-1', ctx);
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
