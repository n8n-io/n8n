import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectPoolSettings } from '../entities';

const CATEGORY_COLUMN = {
	production: 'productionPool',
	manual: 'manualPool',
	evaluation: 'evaluationPool',
} as const satisfies Record<string, keyof ProjectPoolSettings>;

@Service()
export class ProjectPoolSettingsRepository extends Repository<ProjectPoolSettings> {
	constructor(dataSource: DataSource) {
		super(ProjectPoolSettings, dataSource.manager);
	}

	async getPoolForCategory(
		projectId: string,
		category: 'production' | 'manual' | 'evaluation',
	): Promise<string | undefined> {
		const column = CATEGORY_COLUMN[category];
		const row = await this.findOne({
			where: { projectId },
			select: [column],
		});
		return row?.[column] ?? undefined;
	}
}
