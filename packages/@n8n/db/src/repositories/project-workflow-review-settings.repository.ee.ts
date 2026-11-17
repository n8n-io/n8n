import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
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

	/** Returns `true` only when the stored value changed, so concurrent writers report one change. */
	async setProjectApprovalRequired(
		projectId: string,
		required: boolean,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			await manager
				.createQueryBuilder()
				.insert()
				.into(ProjectWorkflowReviewSettings)
				.values({ projectId })
				.orIgnore()
				.execute();
			const row = await manager.findOneOrFail(ProjectWorkflowReviewSettings, {
				where: { projectId },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
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
