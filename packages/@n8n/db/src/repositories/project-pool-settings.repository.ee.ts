import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectPoolSettings } from '../entities';

@Service()
export class ProjectPoolSettingsRepository extends Repository<ProjectPoolSettings> {
	constructor(dataSource: DataSource) {
		super(ProjectPoolSettings, dataSource.manager);
	}

	async getDefaultPool(projectId: string): Promise<string | null> {
		const row = await this.findOne({ where: { projectId }, select: ['defaultPool'] });
		return row?.defaultPool ?? null;
	}

	async setDefaultPool(projectId: string, defaultPool: string | null): Promise<void> {
		await this.upsert({ projectId, defaultPool }, ['projectId']);
	}
}
