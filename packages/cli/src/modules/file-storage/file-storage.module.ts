import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'file-storage' })
export class FileStorageModule implements ModuleInterface {
	async init() {
		await import('./file-storage.controller.js');
		await import('./file-storage-aggregate.controller.js');

		const { ProjectFileStore } = await import('./project-file-store.js');
		const { registerFileStorageByteStores } = await import('./register-blob-byte-stores.js');
		await registerFileStorageByteStores(Container.get(ProjectFileStore));

		const { FileStorageUploadCleanupService } = await import(
			'./file-storage-upload-cleanup.service.js'
		);
		await Container.get(FileStorageUploadCleanupService).start();

		const { ProjectFileOrphanSweeperService } = await import(
			'./project-file-orphan-sweeper.service.js'
		);
		Container.get(ProjectFileOrphanSweeperService).start();

		const { registerFavoriteResolver } = await import('./register-favorite-resolver.js');
		registerFavoriteResolver();

		const { ProjectFileService } = await import('./file-storage.service.js');
		const { OwnershipTransferHandlerRegistry } = await import(
			'@/services/ownership-transfer/ownership-transfer-handler.registry.js'
		);
		Container.get(OwnershipTransferHandlerRegistry).register({
			resource: 'file',
			transferAll: async (fromProjectId, toProjectId, trx) => {
				await Container.get(ProjectFileService).transferAllToProject(
					fromProjectId,
					toProjectId,
					trx,
				);
			},
			deleteAll: async (projectId) => {
				await Container.get(ProjectFileService).deleteAllByProjectId(projectId);
			},
		});
	}

	@OnShutdown()
	async shutdown() {
		const { FileStorageUploadCleanupService } = await import(
			'./file-storage-upload-cleanup.service.js'
		);
		await Container.get(FileStorageUploadCleanupService).shutdown();

		const { ProjectFileOrphanSweeperService } = await import(
			'./project-file-orphan-sweeper.service.js'
		);
		Container.get(ProjectFileOrphanSweeperService).shutdown();
	}

	async entities() {
		const { ProjectFile } = await import('./project-file.entity.js');

		return [ProjectFile];
	}

	async context() {
		const { ProjectFilesProxyService } = await import('./project-files-proxy.service.js');
		const { ProjectFilesSnapshotService } = await import('./project-files-snapshot.service.js');
		const { FileSigningService } = await import('./file-signing.service.js');

		return {
			projectFilesProxyProvider: Container.get(ProjectFilesProxyService),
			// Back the `$files` expression: getBase() loads the snapshot per
			// execution; the signer backs the lazy `.url` getter (sync — the
			// expression sandbox is synchronous).
			getProjectFilesSnapshot: async (projectId: string) =>
				await Container.get(ProjectFilesSnapshotService).getSnapshot(projectId),
			signProjectFileToken: (fileId: string) =>
				Container.get(FileSigningService).createSignedToken(fileId),
		};
	}
}
