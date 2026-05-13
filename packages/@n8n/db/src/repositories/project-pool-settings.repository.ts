import type { PoolAssignment } from '@n8n/api-types';
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

	async getSettings(
		projectId: string,
	): Promise<{ assignment: PoolAssignment; allowedPools: string[] } | undefined> {
		const row = await this.findOneBy({ projectId });
		if (!row) return undefined;

		const assignment: PoolAssignment = {};
		if (row.productionPool) assignment.production = row.productionPool;
		if (row.manualPool) assignment.manual = row.manualPool;
		if (row.evaluationPool) assignment.evaluation = row.evaluationPool;

		return { assignment, allowedPools: row.allowedPools };
	}

	async setSettings(
		projectId: string,
		next: { assignment: PoolAssignment; allowedPools: string[] },
	): Promise<void> {
		const existing = await this.findOneBy({ projectId });
		const row =
			existing ??
			this.create({
				projectId,
				productionPool: null,
				manualPool: null,
				evaluationPool: null,
				allowedPools: [],
			});

		row.productionPool = next.assignment.production ?? null;
		row.manualPool = next.assignment.manual ?? null;
		row.evaluationPool = next.assignment.evaluation ?? null;
		row.allowedPools = next.allowedPools;

		await this.save(row);
	}
}
