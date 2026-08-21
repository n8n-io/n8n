import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestState,
} from '../entities/workflow-review-request.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

/** The review's linked workflow as shown in cross-request lists (inbox). */
export type WorkflowReviewRequestLinkedWorkflow = {
	workflowName: string;
	workflowVersionId: string | null;
};

export type WorkflowReviewRequestWorkflowDetailRow = {
	workflowId: string;
	workflowName: string;
	workflowVersionId: string | null;
	activeVersionId: string | null;
	baselineVersionId: string | null;
	/**
	 * The parent request's state. It comes from this same query, so it always matches
	 * the `baselineVersionId` beside it — the detail read needs both to pick a baseline.
	 */
	requestState: WorkflowReviewRequestState;
};

@Service()
export class WorkflowReviewRequestWorkflowRepository extends BaseRepository<WorkflowReviewRequestWorkflow> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewRequestWorkflow, dataSource.manager, transactionRunner);
	}

	async createWorkflowRow(
		input: {
			id?: string;
			workflowReviewRequestId: string;
			workflowId: string;
			workflowVersionId?: string | null;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestWorkflow> {
		const entity = this.create({
			id: input.id,
			workflowReviewRequestId: input.workflowReviewRequestId,
			workflowId: input.workflowId,
			workflowVersionId: input.workflowVersionId ?? null,
		});

		return await this.managerFor(ctx).save(WorkflowReviewRequestWorkflow, entity);
	}

	/** Targets the (requestId, workflowId) pair so another workflow's row can never be re-pinned. */
	async updateWorkflowVersion(
		input: {
			workflowReviewRequestId: string;
			workflowId: string;
			workflowVersionId: string;
		},
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).update(
			WorkflowReviewRequestWorkflow,
			{
				workflowReviewRequestId: input.workflowReviewRequestId,
				workflowId: input.workflowId,
			},
			{ workflowVersionId: input.workflowVersionId },
		);
	}

	/**
	 * Every request — open or closed — whose pin matches the published version exactly. The happy
	 * path is approval (which closes the request) followed by auto-publish, so the publish
	 * recorder must reach closed requests too; the exact-version match is what keeps those
	 * appends bounded.
	 */
	async findRequestIdsPinnedToVersion(
		input: { workflowId: string; workflowVersionId: string },
		ctx: OperationContext,
	): Promise<string[]> {
		const rows = await this.managerFor(ctx).find(WorkflowReviewRequestWorkflow, {
			select: ['workflowReviewRequestId'],
			where: {
				workflowId: input.workflowId,
				workflowVersionId: input.workflowVersionId,
			},
		});

		return rows.map((row) => row.workflowReviewRequestId);
	}

	/**
	 * Freeze the live published pointer onto the child row at approval time.
	 * Read from the workflow row, which both publication paths maintain — the
	 * publication-service table exists only on the outbox path, so reading it here
	 * would freeze null everywhere else. On the outbox path the row can run ahead
	 * of the wired triggers while the outbox drains, but the committed pointer is
	 * what every surface (canvas, publish timeline, the feed's published entry)
	 * already calls "published". Both the SELECT and UPDATE go through `ctx` so
	 * they share the lock transaction.
	 */
	async captureApprovalBaseline(
		input: {
			workflowReviewRequestId: string;
			workflowId: string;
		},
		ctx: OperationContext,
	): Promise<void> {
		const workflow = await this.managerFor(ctx).findOne(WorkflowEntity, {
			select: ['activeVersionId'],
			where: { id: input.workflowId },
		});

		await this.managerFor(ctx).update(
			WorkflowReviewRequestWorkflow,
			{
				workflowReviewRequestId: input.workflowReviewRequestId,
				workflowId: input.workflowId,
			},
			{ baselineVersionId: workflow?.activeVersionId ?? null },
		);
	}

	async findByRequestId(
		requestId: string,
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestWorkflow[]> {
		return await this.managerFor(ctx).find(WorkflowReviewRequestWorkflow, {
			where: { workflowReviewRequestId: requestId },
			order: { id: 'ASC' },
		});
	}

	/** One workflow per review for now; multi-workflow "primary" selection can wait. */
	async findLinkedWorkflowsByRequestIds(
		requestIds: string[],
	): Promise<Map<string, WorkflowReviewRequestLinkedWorkflow>> {
		if (requestIds.length === 0) {
			return new Map();
		}

		// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
		const rows = await this.createQueryBuilder('wrw')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = wrw.workflowId')
			.select('wrw.workflowReviewRequestId', 'requestId')
			.addSelect('workflow.name', 'workflowName')
			.addSelect('wrw.workflowVersionId', 'workflowVersionId')
			.where('wrw.workflowReviewRequestId IN (:...requestIds)', { requestIds })
			.getRawMany<{
				requestId: string;
				workflowName: string;
				workflowVersionId: string | null;
			}>();

		return new Map(
			rows.map((row) => [
				row.requestId,
				{ workflowName: row.workflowName, workflowVersionId: row.workflowVersionId ?? null },
			]),
		);
	}

	async findLinkedWorkflowDetailsByRequestId(
		requestId: string,
	): Promise<WorkflowReviewRequestWorkflowDetailRow[]> {
		// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
		const rows = await this.createQueryBuilder('wrw')
			// The inner join is safe: `workflowId` FKs onto `workflow_entity` with
			// `ON DELETE CASCADE`, so a child row never outlives its workflow.
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = wrw.workflowId')
			// The state is joined in rather than read separately, because an approval writes
			// the baseline and closes the request together: two queries can catch one half
			// of that and miss the other.
			.innerJoin(WorkflowReviewRequest, 'request', 'request.id = wrw.workflowReviewRequestId')
			.select('wrw.workflowId', 'workflowId')
			.addSelect('workflow.name', 'workflowName')
			.addSelect('workflow.activeVersionId', 'activeVersionId')
			.addSelect('wrw.workflowVersionId', 'workflowVersionId')
			.addSelect('wrw.baselineVersionId', 'baselineVersionId')
			.addSelect('request.state', 'requestState')
			.where('wrw.workflowReviewRequestId = :requestId', { requestId })
			.orderBy('wrw.id', 'ASC')
			.getRawMany<{
				workflowId: string;
				workflowName: string;
				workflowVersionId: string | null;
				activeVersionId: string | null;
				baselineVersionId: string | null;
				requestState: WorkflowReviewRequestState;
			}>();

		return rows.map((row) => ({
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowVersionId: row.workflowVersionId ?? null,
			activeVersionId: row.activeVersionId ?? null,
			baselineVersionId: row.baselineVersionId ?? null,
			requestState: row.requestState,
		}));
	}
}
