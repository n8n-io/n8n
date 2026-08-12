import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'project-files' })
export class ProjectFilesModule implements ModuleInterface {
	async init() {
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

	async entities() {
		const { ProjectFile } = await import('./project-file.entity.js');

		return [ProjectFile];
	}
}
