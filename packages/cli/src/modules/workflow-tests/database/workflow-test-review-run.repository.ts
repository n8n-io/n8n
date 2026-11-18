import type { WorkflowTestRunResult } from '@n8n/api-types';
import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import {
	WorkflowTestReviewRunEntity,
	type WorkflowTestReviewRunStatus,
} from './workflow-test-review-run.entity';

class WorkflowTestReviewRunTable extends BaseRepository<WorkflowTestReviewRunEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowTestReviewRunEntity, dataSource.manager, transactionRunner);
	}
}

@Service()
export class WorkflowTestReviewRunRepository {
	private readonly table: WorkflowTestReviewRunTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowTestReviewRunTable(dataSource, transactionRunner);
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async startRun(
		run: { workflowReviewRequestId: string; workflowId: string; workflowVersionId: string },
		ctx: OperationContext,
	) {
		return await this.table
			.managerFor(ctx)
			.save(
				WorkflowTestReviewRunEntity,
				this.table.create({ ...run, status: 'running', result: null }),
			);
	}

	async finishRun(
		id: string,
		status: Exclude<WorkflowTestReviewRunStatus, 'running'>,
		result: WorkflowTestRunResult,
		ctx: OperationContext,
	) {
		await this.table
			.managerFor(ctx)
			.update(WorkflowTestReviewRunEntity, { id }, { status, result, updatedAt: new Date() });
	}

	/** The latest run for the workflow in the review, on any version. */
	async findLatest(workflowReviewRequestId: string, workflowId: string, ctx: OperationContext) {
		return await this.table.managerFor(ctx).findOne(WorkflowTestReviewRunEntity, {
			where: { workflowReviewRequestId, workflowId },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
	}
}
