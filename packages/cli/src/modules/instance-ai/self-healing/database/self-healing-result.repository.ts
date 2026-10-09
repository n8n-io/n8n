import type { InboxCounts, InboxState } from '@n8n/api-types';
import {
	BaseRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	TransactionRunner,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { DataSource, IsNull } from '@n8n/typeorm';

import { SelfHealingResult } from './self-healing-result.entity';

export type CreateSelfHealingResult = Pick<
	SelfHealingResult,
	| 'workflowId'
	| 'projectId'
	| 'backgroundUserId'
	| 'outcome'
	| 'summary'
	| 'report'
	| 'completedAt'
	| 'executionId'
	| 'suggestionId'
	| 'usage'
>;

export type SelfHealingInboxAccess = {
	user: User;
	globalScopes: Scope[];
	projectRoles: string[];
	workflowRoles: string[];
};

type SelfHealingInboxBoundary =
	| { mode: 'beforeTime'; createdAt: Date }
	| { mode: 'afterItem'; createdAt: Date; id: string };

type SelfHealingInboxQuery = {
	state: InboxState;
	limit: number;
	boundary?: SelfHealingInboxBoundary;
};

const inboxState = `CASE WHEN result.dismissedAt IS NULL
	AND (result.suggestionId IS NULL OR suggestion.state = 'pending')
	THEN 'open' ELSE 'closed' END`;

@Service()
export class SelfHealingResultRepository extends BaseRepository<SelfHealingResult> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly sharedWorkflows: SharedWorkflowRepository,
	) {
		super(SelfHealingResult, dataSource.manager, transactionRunner);
	}

	private inboxQuery({ user, ...roles }: SelfHealingInboxAccess) {
		const accessible = this.sharedWorkflows.buildSharedWorkflowIdsSubquery(user, roles);
		return this.createQueryBuilder('result')
			.innerJoin(
				SharedWorkflow,
				'owner',
				'owner.workflowId = result.workflowId AND owner.projectId = result.projectId AND owner.role = :resultOwnerRole',
				{ resultOwnerRole: 'workflow:owner' },
			)
			.leftJoin('result.suggestion', 'suggestion')
			.where(`result.workflowId IN (${accessible.getQuery()})`)
			.setParameters(accessible.getParameters());
	}

	async listForInbox(
		access: SelfHealingInboxAccess,
		{ state, limit, boundary }: SelfHealingInboxQuery,
	) {
		const query = this.inboxQuery(access)
			.innerJoin('result.workflow', 'workflow')
			.select([
				'result.id',
				'result.projectId',
				'result.workflowId',
				'result.summary',
				'result.outcome',
				'result.createdAt',
				'result.updatedAt',
				'result.completedAt',
				'workflow.name',
			])
			.andWhere(`(${inboxState}) = :state`, { state })
			.orderBy('result.createdAt', 'DESC')
			.addOrderBy('result.id', 'ASC');

		if (boundary?.mode === 'afterItem') {
			query.andWhere(
				'(result.createdAt < :createdAt OR (result.createdAt = :createdAt AND result.id > :id))',
				{ createdAt: boundary.createdAt, id: boundary.id },
			);
		} else if (boundary) {
			query.andWhere('result.createdAt < :createdAt', { createdAt: boundary.createdAt });
		}

		const rows = await query.limit(limit).getMany();
		return rows.map((row) => ({
			id: row.id,
			state,
			projectId: row.projectId,
			workflowId: row.workflowId,
			workflowName: row.workflow.name,
			summary: row.summary,
			outcome: row.outcome,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			completedAt: row.completedAt,
		}));
	}

	async countForInbox(access: SelfHealingInboxAccess): Promise<InboxCounts> {
		const counts = await this.inboxQuery(access)
			.select(inboxState, 'state')
			.addSelect('COUNT(*)', 'count')
			.groupBy(inboxState)
			.getRawMany<{ state: InboxState; count: number | string }>();
		return {
			open: Number(counts.find((row) => row.state === 'open')?.count ?? 0),
			closed: Number(counts.find((row) => row.state === 'closed')?.count ?? 0),
		};
	}

	async getResult(
		id: string,
		scope: Pick<SelfHealingResult, 'workflowId' | 'projectId'>,
		ctx: OperationContext = {},
	) {
		const result = await this.managerFor(ctx).findOneBy(SelfHealingResult, {
			id,
			workflowId: scope.workflowId,
			projectId: scope.projectId,
		});
		if (!result) throw new NotFoundError('Self-healing result not found.');
		return result;
	}

	async createResult(input: CreateSelfHealingResult, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingResult, {
				...input,
				dismissedAt: null,
				dismissedById: null,
			}),
		);
	}

	async dismissResult(id: string, userId: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).update(
			SelfHealingResult,
			{ id, dismissedAt: IsNull() },
			{ dismissedAt: new Date(), dismissedById: userId },
		);
		return result.affected === 1;
	}
}
