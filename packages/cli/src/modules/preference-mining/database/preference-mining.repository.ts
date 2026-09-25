import { Folder, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

@Service()
export class PreferenceMiningRepository {
	constructor(private readonly dataSource: DataSource) {}

	async listProjectFolders(projectId: string) {
		return await this.dataSource.getRepository(Folder).find({
			where: { homeProject: { id: projectId } },
			select: { id: true, name: true },
			order: { id: 'ASC' },
			take: 501,
		});
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
