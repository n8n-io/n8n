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
	}

	async entities() {
		const { ProjectFile } = await import('./project-file.entity.js');

		return [ProjectFile];
	}
}
