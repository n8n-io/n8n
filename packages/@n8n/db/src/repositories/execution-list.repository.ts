import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import type { SelectQueryBuilder } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { SharedWorkflowRepository } from './shared-workflow.repository';
import { User, WorkflowEntity } from '../entities';
import type { ExecutionSummaries } from '../entities/types-db';
import { TransactionRunner } from '../services/transaction';
import { applyWorkflowBooleanSettingFilter } from '../utils/apply-workflow-boolean-setting-filter';

/** Workflow visibility and attributes for the merged (CP + DP) execution list. */
@Service()
export class ExecutionListRepository extends BaseRepository<WorkflowEntity> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		transactionRunner: TransactionRunner,
	) {
		super(WorkflowEntity, dataSource.manager, transactionRunner);
	}

	/** Resolve the same workflow visibility and attributes as the execution list. */
	async findWorkflowIdsForExecutionList(query: ExecutionSummaries.RangeQuery): Promise<string[]> {
		if (!query.user || !query.sharingOptions) return [];

		const qb = this.createQueryBuilder('workflow').select('workflow.id', 'id');
		this.applySharedWithUserFilter(qb, query.user, query.sharingOptions);
		this.applyExecutionListFilters(qb, query);

		const rows = await qb.distinct(true).getRawMany<{ id: string }>();
		return rows.map(({ id }) => id);
	}

	/** Restricts `qb` to workflows shared with `user` under `sharingOptions`. */
	private applySharedWithUserFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		user: User,
		sharingOptions: NonNullable<ExecutionSummaries.RangeQuery['sharingOptions']>,
	): void {
		const shared = this.sharedWorkflowRepository
			.buildSharedWorkflowIdsSubquery(user, sharingOptions)
			.andWhere('sw.workflowId = workflow.id');
		qb.where(`EXISTS (${shared.getQuery()})`).setParameters(shared.getParameters());
	}

	private applyExecutionListFilters(
		qb: SelectQueryBuilder<WorkflowEntity>,
		query: ExecutionSummaries.RangeQuery,
	): void {
		if (query.workflowId) {
			qb.andWhere('workflow.id = :workflowId', { workflowId: query.workflowId });
		}
		if (query.projectId) {
			qb.innerJoin('workflow.shared', 'projectShare', 'projectShare.projectId = :projectId', {
				projectId: query.projectId,
			});
		}
		if (query.isArchived !== undefined) {
			qb.andWhere('workflow.isArchived = :isArchived', { isArchived: query.isArchived });
		}
		for (const filter of query.workflowBooleanSettings ?? []) {
			applyWorkflowBooleanSettingFilter(qb, this.globalConfig, filter.key, filter.value);
		}
	}

	async findNamesForExecutionList(
		ids: string[],
	): Promise<Array<Pick<WorkflowEntity, 'id' | 'name'>>> {
		if (ids.length === 0) return [];

		return await this.find({ select: ['id', 'name'], where: { id: In(ids) } });
	}
}
