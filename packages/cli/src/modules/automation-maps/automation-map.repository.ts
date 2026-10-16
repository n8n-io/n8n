import { DataSource, In, Like, Repository } from '@n8n/typeorm';
import { Service } from '@n8n/di';
import { CredentialsEntity, WorkflowEntity } from '@n8n/db';

import { AutomationMap } from './automation-map.entity';

@Service()
export class AutomationMapRepository extends Repository<AutomationMap> {
	constructor(dataSource: DataSource) {
		super(AutomationMap, dataSource.manager);
	}

	async findInProjects(projectIds: string[]): Promise<AutomationMap[]> {
		if (projectIds.length === 0) return [];
		return await this.find({
			where: { projectId: In(projectIds) },
			order: { updatedAt: 'DESC' },
		});
	}

	async findWorkflowIdsByName(nameQuery: string, projectId?: string): Promise<string[]> {
		const rows = await this.manager.getRepository(WorkflowEntity).find({
			select: { id: true },
			where: {
				name: Like(`%${nameQuery}%`),
				isArchived: false,
				...(projectId ? { shared: { projectId, role: 'workflow:owner' } } : {}),
			},
			relations: projectId ? { shared: true } : undefined,
		});
		return rows.map((row) => row.id);
	}

	async findWorkflowIdsByTagNames(tagNames: string[], projectId?: string): Promise<string[]> {
		if (tagNames.length === 0) return [];
		const rows = await this.manager.getRepository(WorkflowEntity).find({
			select: { id: true },
			where: {
				isArchived: false,
				tags: { name: In(tagNames) },
				...(projectId ? { shared: { projectId, role: 'workflow:owner' } } : {}),
			},
			relations: { tags: true, ...(projectId ? { shared: true } : {}) },
		});
		return rows.map((row) => row.id);
	}

	async findCredentialsByIds(
		ids: string[],
	): Promise<Array<Pick<CredentialsEntity, 'id' | 'name' | 'type'>>> {
		if (ids.length === 0) return [];
		return await this.manager.getRepository(CredentialsEntity).find({
			select: { id: true, name: true, type: true },
			where: { id: In(ids) },
		});
	}
}
