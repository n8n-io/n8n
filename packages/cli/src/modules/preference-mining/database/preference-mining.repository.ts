import { Folder, FolderRepository, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

@Service()
export class PreferenceMiningRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly folderRepository: FolderRepository,
	) {}

	async listProjectFolders(projectId: string) {
		const folders = await this.dataSource.getRepository(Folder).find({
			where: { homeProject: { id: projectId } },
			select: { id: true, name: true, parentFolderId: true },
			order: { id: 'ASC' },
			take: 501,
		});
		if (folders.length === 0) return [];
		const paths = await this.folderRepository.getFolderPathsToRoot(folders.map(({ id }) => id));
		return folders.map((folder) => ({
			...folder,
			path: paths.get(folder.id)?.join('/') ?? folder.name,
		}));
	}

	async findProjectWorkflowFolders(projectId: string, workflowIds: string[]) {
		if (workflowIds.length === 0) return [];
		return await this.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('workflow')
			.innerJoin('workflow.shared', 'shared', 'shared.projectId = :projectId', { projectId })
			.leftJoin('workflow.parentFolder', 'folder', 'folder.projectId = :projectId', { projectId })
			.select('workflow.id', 'workflowId')
			.addSelect('folder.id', 'folderId')
			.where('workflow.id IN (:...workflowIds)', { workflowIds })
			.getRawMany<{ workflowId: string; folderId: string | null }>();
	}
}
