import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

@BackendModule({ name: 'apps', instanceTypes: ['main'] })
export class AppsModule implements ModuleInterface {
	async init() {
		await import('./apps.controller.js');
		await import('./apps-list.controller.js');
		await import('./build/app-build.controller.js');
		const { AppBlobStore } = await import('./storage/app-blob-store.js');
		await Container.get(AppBlobStore).init();
		const { AppSourceVersionStore, AppBuildResultStore } = await import(
			'./storage/app-version-stores.js'
		);
		const { SnapshotAppSourceVersionStore, SnapshotAppBuildResultStore } = await import(
			'./storage/snapshot-app-version-stores.js'
		);
		Container.set(AppSourceVersionStore, Container.get(SnapshotAppSourceVersionStore));
		Container.set(AppBuildResultStore, Container.get(SnapshotAppBuildResultStore));
		Container.get(Logger).warn('The apps module is experimental.');
	}

	@OnShutdown()
	async shutdown() {
		const { AppBuildService } = await import('./build/app-build.service.js');
		await Container.get(AppBuildService).shutdown();
	}

	async systemTasks() {
		const { AppStorageCleanupTask } = await import('./storage/app-storage-cleanup.task.js');
		const { AppBuildReconciliationTask } = await import('./build/app-build-reconciliation.task.js');
		return [AppStorageCleanupTask, AppBuildReconciliationTask];
	}

	async entities() {
		const { App } = await import('./app.entity.js');
		const { AppVersion } = await import('./versions/app-version.entity.js');
		const { AppArtifact } = await import('./storage/app-artifact.entity.js');
		return [App, AppVersion, AppArtifact];
	}

	async settings() {
		return { enabled: true };
	}
}
