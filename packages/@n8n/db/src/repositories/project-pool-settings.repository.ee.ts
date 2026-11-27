import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ProjectPoolSettings } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ProjectPoolSettingsTable extends BaseRepository<ProjectPoolSettings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ProjectPoolSettings, dataSource.manager, transactionRunner);
	}
}

@Service()
export class ProjectPoolSettingsRepository {
	private readonly table: ProjectPoolSettingsTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ProjectPoolSettingsTable(dataSource, transactionRunner);
	}

	async getDefaultPool(projectId: string, ctx: OperationContext): Promise<string | null> {
		const row = await this.table.managerFor(ctx).findOne(ProjectPoolSettings, {
			where: { projectId },
			select: ['defaultPool'],
		});
		return row?.defaultPool ?? null;
	}

	async setDefaultPool(
		projectId: string,
		defaultPool: string | null,
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.upsert(ProjectPoolSettings, { projectId, defaultPool }, ['projectId']);
	}
}
