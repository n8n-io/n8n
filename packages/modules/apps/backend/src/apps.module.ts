import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

@BackendModule({ name: 'apps', instanceTypes: ['main'] })
export class AppsModule implements ModuleInterface {
	async init() {
		await import('./apps.controller.js');
		await import('./apps-list.controller.js');
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

	async systemTasks() {
		const { AppStorageCleanupTask } = await import('./app-storage-cleanup.task.js');
		return [AppStorageCleanupTask];
	}

	async entities() {
		const { App } = await import('./app.entity.js');
		const { AppVersion } = await import('./app-version.entity.js');
		const { AppArtifact } = await import('./app-artifact.entity.js');
		return [App, AppVersion, AppArtifact];
	}

	async settings() {
		return { enabled: true };
	}
}
