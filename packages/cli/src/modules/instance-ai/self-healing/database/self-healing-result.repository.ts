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

import { SelfHealingConfigurationReviewer } from './self-healing-configuration-reviewer.entity';
import { SelfHealingInvestigation } from './self-healing-investigation.entity';
import { SelfHealingResult } from './self-healing-result.entity';

// Keep in sync with getSelfHealingReviewState(), which returns 'open' for the same rows.
const inboxState = `CASE WHEN result.dismissedAt IS NULL
	AND result.outcome <> 'could_not_fix'
	AND (result.suggestionId IS NULL OR suggestion.state = 'pending')
	THEN 'open' ELSE 'closed' END`;

export type CreateSelfHealingResult = Pick<
	SelfHealingResult,
	| 'configurationId'
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
	| { mode: 'beforeTime'; updatedAt: Date }
	| { mode: 'beforeOrAtTime'; updatedAt: Date }
	| { mode: 'afterItem'; updatedAt: Date; id: string };

type SelfHealingInboxQuery = {
	state: InboxState;
	limit: number;
	boundary?: SelfHealingInboxBoundary;
};

type CooldownQuery = {
	workflowId: string;
	projectId: string;
	completedAfter: Date;
};

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
			.leftJoin('result.suggestion', 'suggestion')
			.innerJoin(
				SharedWorkflow,
				'owner',
				'owner.workflowId = result.workflowId AND owner.projectId = result.projectId AND owner.role = :resultOwnerRole',
				{ resultOwnerRole: 'workflow:owner' },
			)
			.innerJoin('result.configuration', 'configuration')
			.innerJoin(
				SelfHealingConfigurationReviewer,
				'reviewer',
				'reviewer.configurationId = configuration.id AND reviewer.userId = :reviewerId',
				{ reviewerId: user.id },
			)
			.where(`result.workflowId IN (${accessible.getQuery()})`)
			.setParameters(accessible.getParameters());
	}

	async getOpenForWorkflow(workflowId: string, projectId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx)
			.createQueryBuilder(SelfHealingResult, 'result')
			.select('result.id')
			.leftJoin('result.suggestion', 'suggestion')
			.where({ workflowId, projectId })
			.andWhere(`(${inboxState}) = :state`, { state: 'open' })
			.getOne();
	}

	async isInCooldown(
		{ workflowId, projectId, completedAfter }: CooldownQuery,
		ctx: OperationContext = {},
	): Promise<boolean> {
		return await this.managerFor(ctx)
			.createQueryBuilder(SelfHealingResult, 'result')
			.innerJoin(SelfHealingInvestigation, 'investigation', 'investigation.resultId = result.id')
			.innerJoin('result.workflow', 'workflow')
			.where({ workflowId, projectId, outcome: 'could_not_fix' })
			.andWhere('result.completedAt > :completedAfter', { completedAfter })
			.andWhere('investigation.publishedVersionId = workflow.activeVersionId')
			.getExists();
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
			.orderBy('result.updatedAt', 'DESC')
			.addOrderBy('result.id', 'ASC');

		if (boundary?.mode === 'afterItem') {
			query.andWhere(
				'(result.updatedAt < :updatedAt OR (result.updatedAt = :updatedAt AND result.id > :id))',
				{ updatedAt: boundary.updatedAt, id: boundary.id },
			);
		} else if (boundary) {
			const operator = boundary.mode === 'beforeOrAtTime' ? '<=' : '<';
			query.andWhere(`result.updatedAt ${operator} :updatedAt`, { updatedAt: boundary.updatedAt });
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
