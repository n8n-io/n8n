import type { PreferenceMiningRun, PreferenceMiningRunPage } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { PreferenceMiningRunEntity } from './preference-mining-run.entity';

@Service()
export class PreferenceMiningRunRepository {
	constructor(private readonly dataSource: DataSource) {}

	async saveRun(userId: string, run: PreferenceMiningRun) {
		await this.dataSource.getRepository(PreferenceMiningRunEntity).save({
			id: run.id,
			userId,
			projectId: run.projectId,
			data: run,
			summary: {
				id: run.id,
				createdAt: run.createdAt ?? new Date().toISOString(),
				status: run.status,
				model: run.model?.id ?? null,
				approaches: run.settings?.approaches ?? run.results.map((result) => result.approach),
				preferenceCount: run.results.reduce(
					(count, result) => count + result.preferences.length,
					0,
				),
				estimatedCost: run.metrics?.estimatedCost ?? null,
			},
		});
	}

	async findRun(userId: string, projectId: string, id: string) {
		const row = await this.dataSource.getRepository(PreferenceMiningRunEntity).findOne({
			where: { id, userId, projectId },
		});
		return row?.data;
	}

	async listRuns(
		userId: string,
		projectId: string,
		skip: number,
		take: number,
	): Promise<PreferenceMiningRunPage> {
		const [rows, total] = await this.dataSource
			.getRepository(PreferenceMiningRunEntity)
			.findAndCount({
				where: { userId, projectId },
				select: ['id', 'summary', 'createdAt'],
				order: { createdAt: 'DESC', id: 'DESC' },
				skip,
				take,
			});
		return { items: rows.map((row) => row.summary), total };
	}
}
