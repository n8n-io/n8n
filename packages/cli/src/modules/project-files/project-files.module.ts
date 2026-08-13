import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'project-files' })
export class ProjectFilesModule implements ModuleInterface {
	async init() {
		await import('./project-files.controller.js');

		const { ProjectFileCleanupService } = await import('./project-file-cleanup.service.js');
		Container.get(ProjectFileCleanupService).start();

		const { OwnershipTransferHandlerRegistry } = await import(
			'@/services/ownership-transfer/ownership-transfer-handler.registry.js'
		);
		const { ProjectFileRepository } = await import('./project-file.repository.js');
		const { ProjectFileService } = await import('./project-file.service.js');

		Container.get(OwnershipTransferHandlerRegistry).register({
			resource: 'project-file',
			transferAll: async (fromProjectId, toProjectId, trx) => {
				await Container.get(ProjectFileRepository).transferAllToProject(
					fromProjectId,
					toProjectId,
					trx,
				);
			},
			// The projectId FK cascades the rows away, but not the stored bytes.
			deleteAll: async (projectId) => {
				await Container.get(ProjectFileService).deleteAllByProjectId(projectId);
			},
		});
	}

	@OnShutdown()
	async shutdown() {
		const { ProjectFileCleanupService } = await import('./project-file-cleanup.service.js');
		Container.get(ProjectFileCleanupService).shutdown();
	}

	async entities() {
		const { ProjectFile } = await import('./project-file.entity.js');

		return [ProjectFile];
	}

	async context() {
		const { ProjectFileProxyService } = await import('./project-file-proxy.service.js');

		return { projectFileProxyProvider: Container.get(ProjectFileProxyService) };
	}
}
