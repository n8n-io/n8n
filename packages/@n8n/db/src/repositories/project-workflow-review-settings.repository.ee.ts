import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Project } from '../entities/project';
import { ProjectWorkflowReviewSettings } from '../entities/project-workflow-review-settings.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ProjectWorkflowReviewSettingsTable extends BaseRepository<ProjectWorkflowReviewSettings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ProjectWorkflowReviewSettings, dataSource.manager, transactionRunner);
	}
}

@Service()
export class ProjectWorkflowReviewSettingsRepository {
	private readonly table: ProjectWorkflowReviewSettingsTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ProjectWorkflowReviewSettingsTable(dataSource, transactionRunner);
	}

	async isProjectApprovalRequired(projectId: string, ctx: OperationContext): Promise<boolean> {
		const row = await this.table.managerFor(ctx).findOne(ProjectWorkflowReviewSettings, {
			where: { projectId },
			select: ['projectApprovalRequired'],
		});
		return row?.projectApprovalRequired ?? false;
	}

	/**
	 * Returns `true` only when the stored value changed, so concurrent writers report one change.
	 * Returns `null` when no team project has this id. The project row stays locked until the
	 * write commits, so a concurrent project delete cannot break the insert.
	 */
	async setTeamProjectApprovalRequired(
		projectId: string,
		required: boolean,
		ctx: OperationContext,
	): Promise<boolean | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const isPostgres = manager.connection.options.type === 'postgres';
			const project = await manager.findOne(Project, {
				where: { id: projectId, type: 'team' },
				select: ['id'],
				lock: isPostgres ? { mode: 'pessimistic_read' } : undefined,
			});
			if (!project) return null;

			await manager
				.createQueryBuilder()
				.insert()
				.into(ProjectWorkflowReviewSettings)
				.values({ projectId })
				.orIgnore()
				.execute();
			const row = await manager.findOneOrFail(ProjectWorkflowReviewSettings, {
				where: { projectId },
				lock: isPostgres ? { mode: 'pessimistic_write' } : undefined,
			});
			if (row.projectApprovalRequired === required) return false;

			await manager.update(
				ProjectWorkflowReviewSettings,
				{ projectId },
				{ projectApprovalRequired: required },
			);
			return true;
		});
	}
}
