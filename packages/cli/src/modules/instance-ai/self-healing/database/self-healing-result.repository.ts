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
import { DataSource } from '@n8n/typeorm';

import { WorkflowSuggestion } from '../../workflow-suggestions/database/workflow-suggestion.entity';
import { whereReviewer } from './self-healing-configuration.repository';
import { SelfHealingInvestigation } from './self-healing-investigation.entity';
import { SelfHealingResult } from './self-healing-result.entity';

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

const INBOX_STATE = "CASE WHEN result.reviewState = 'open' THEN 'open' ELSE 'closed' END";

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
		const query = this.createQueryBuilder('result')
			.innerJoin(
				SharedWorkflow,
				'owner',
				'owner.workflowId = result.workflowId AND owner.projectId = result.projectId AND owner.role = :resultOwnerRole',
				{ resultOwnerRole: 'workflow:owner' },
			)
			.innerJoin('result.configuration', 'configuration')
			.where(`result.workflowId IN (${accessible.getQuery()})`)
			.setParameters(accessible.getParameters());
		const inaccessibleSuggestion = query
			.subQuery()
			.select('1')
			.from(WorkflowSuggestion, 'target')
			.leftJoin(
				SharedWorkflow,
				'targetOwner',
				'targetOwner.workflowId = target.workflowId AND targetOwner.projectId = result.projectId AND targetOwner.role = :resultOwnerRole',
			)
			.where('target.selfHealingResultId = result.id')
			.andWhere(
				`(target.workflowId NOT IN (${accessible.getQuery()}) OR targetOwner.workflowId IS NULL)`,
			)
			.getQuery();
		query.andWhere(`NOT EXISTS ${inaccessibleSuggestion}`).setParameter('reviewerId', user.id);
		return whereReviewer(query, 'configuration', ':reviewerId');
	}

	private openResultsForWorkflowQuery(
		workflowId: string,
		projectId: string | undefined,
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		const triggered = manager
			.createQueryBuilder(SelfHealingResult, 'result')
			.select('result.id', 'id')
			.where('result.workflowId = :workflowId')
			.andWhere("result.reviewState = 'open'");
		const targeted = manager
			.createQueryBuilder(WorkflowSuggestion, 'suggestion')
			.select('suggestion.selfHealingResultId', 'id')
			.innerJoin('suggestion.selfHealingResult', 'result')
			.where('suggestion.workflowId = :workflowId')
			.andWhere("suggestion.state = 'pending'")
			.andWhere("result.reviewState = 'open'");
		if (projectId !== undefined) {
			triggered.andWhere('result.projectId = :projectId');
			targeted.andWhere('result.projectId = :projectId');
		}
		return manager
			.createQueryBuilder()
			.select('open_result.id', 'id')
			.from(`(${triggered.getQuery()} UNION ${targeted.getQuery()})`, 'open_result')
			.setParameters({ workflowId, projectId });
	}

	async getOpenForWorkflow(workflowId: string, projectId: string, ctx: OperationContext = {}) {
		return (
			(await this.openResultsForWorkflowQuery(workflowId, projectId, ctx)
				.limit(1)
				.getRawOne<{ id: string }>()) ?? null
		);
	}

	async getOpenResultIds(workflowId: string, ctx: OperationContext = {}) {
		const results = await this.openResultsForWorkflowQuery(workflowId, undefined, ctx).getRawMany<{
			id: string;
		}>();
		return results.map(({ id }) => id);
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
			.andWhere(`(${INBOX_STATE}) = :state`, { state })
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
			.select(INBOX_STATE, 'state')
			.addSelect('COUNT(*)', 'count')
			.groupBy(INBOX_STATE)
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
				reviewState: input.outcome === 'could_not_fix' ? 'closed' : 'open',
			}),
		);
	}

	async dismissResult(id: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).update(
			SelfHealingResult,
			{ id, reviewState: 'open' },
			{ reviewState: 'dismissed' },
		);
		return result.affected === 1;
	}
}
