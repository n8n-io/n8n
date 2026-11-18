import type {
	InboxCounts,
	InboxState,
	SelfHealingAgentApplyProgress,
	SelfHealingAgentReviewState,
} from '@n8n/api-types';
import { BaseRepository, ProjectRelation, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { SelfHealingConfiguration } from '../../database/self-healing-configuration.entity';
import { whereReviewer } from '../../database/self-healing-configuration.repository';
import { SelfHealingAgentResult } from './self-healing-agent-result.entity';

class SelfHealingAgentResultTable extends BaseRepository<SelfHealingAgentResult> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SelfHealingAgentResult, dataSource.manager, transactionRunner);
	}
}

export type CreateSelfHealingAgentResult = Pick<
	SelfHealingAgentResult,
	| 'configurationId'
	| 'projectId'
	| 'agentId'
	| 'agentName'
	| 'backgroundUserId'
	| 'baseVersionId'
	| 'goals'
	| 'trigger'
	| 'traceWindowStart'
	| 'traceWindowEnd'
	| 'traceCount'
	| 'summary'
	| 'report'
	| 'edits'
	| 'evalCases'
	| 'evidence'
	| 'usage'
>;

export type SelfHealingAgentInboxAccess = {
	userId: string;
	/** True when a global role gives the reviewer scopes in every project. */
	hasGlobalAccess: boolean;
	/** Project roles that give the reviewer scopes. */
	projectRoles: string[];
};

type SelfHealingAgentInboxBoundary =
	| { mode: 'beforeTime'; updatedAt: Date }
	| { mode: 'beforeOrAtTime'; updatedAt: Date }
	| { mode: 'afterItem'; updatedAt: Date; id: string };

export type SelfHealingAgentInboxQuery = {
	state: InboxState;
	limit: number;
	boundary?: SelfHealingAgentInboxBoundary;
};

export type SaveSelfHealingAgentApplyProgress = {
	applyProgress: SelfHealingAgentApplyProgress;
	applyError: string | null;
	/** True when the apply stops. False when the apply continues with the next step. */
	releaseClaim: boolean;
};

export type CloseSelfHealingAgentResult = {
	/** The person who closed the proposal. Null for an automatic apply and for `outdated`. */
	closedById: string | null;
	appliedAutomatically?: boolean;
	publishedVersionId?: string | null;
	applyProgress?: SelfHealingAgentApplyProgress;
	/**
	 * A caller that does not hold the apply claim gives the time before which a claim is stale.
	 * The close then fails while another apply is in progress.
	 */
	claimStaleBefore?: Date;
};

const INBOX_STATE = "CASE WHEN result.reviewState = 'open' THEN 'open' ELSE 'closed' END";

/** A proposal is free when no apply holds it, or when the apply that held it crashed. */
const NO_LIVE_CLAIM = '("applyStartedAt" IS NULL OR "applyStartedAt" < :staleBefore)';

const EMPTY_APPLY_PROGRESS: SelfHealingAgentApplyProgress = {
	evalsApplied: false,
	savedSkillIds: [],
	savedVersionId: null,
	agentPublished: false,
};

@Service()
export class SelfHealingAgentResultRepository {
	private readonly table: SelfHealingAgentResultTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new SelfHealingAgentResultTable(dataSource, transactionRunner);
	}

	/** Proposals that the user can review: a reviewer of the configuration with agent edit access. */
	private inboxQuery({ userId, hasGlobalAccess, projectRoles }: SelfHealingAgentInboxAccess) {
		const query = this.table
			.createQueryBuilder('result')
			.innerJoin(
				SelfHealingConfiguration,
				'configuration',
				'configuration.id = result.configurationId',
			)
			.setParameter('reviewerId', userId);
		whereReviewer(query, 'configuration', ':reviewerId');
		if (hasGlobalAccess) return query;
		if (projectRoles.length === 0) return query.andWhere('1 = 0');

		const projectAccess = query
			.subQuery()
			.select('1')
			.from(ProjectRelation, 'agentAccess')
			.where('agentAccess.projectId = result.projectId')
			.andWhere('agentAccess.userId = :reviewerId')
			.andWhere('agentAccess.role IN (:...agentProjectRoles)')
			.getQuery();
		return query
			.andWhere(`EXISTS ${projectAccess}`)
			.setParameter('agentProjectRoles', projectRoles);
	}

	async listForInbox(
		access: SelfHealingAgentInboxAccess,
		{ state, limit, boundary }: SelfHealingAgentInboxQuery,
	) {
		// The list never loads the report, the edits or the evidence.
		const query = this.inboxQuery(access)
			.select([
				'result.id',
				'result.projectId',
				'result.agentId',
				'result.agentName',
				'result.summary',
				'result.reviewState',
				'result.appliedAutomatically',
				'result.createdAt',
				'result.updatedAt',
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
			agentId: row.agentId,
			agentName: row.agentName,
			summary: row.summary,
			reviewState: row.reviewState,
			appliedAutomatically: row.appliedAutomatically,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}));
	}

	async countForInbox(access: SelfHealingAgentInboxAccess): Promise<InboxCounts> {
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

	/** The open proposal of the agent. An agent has at most one. */
	async getOpenForAgent(agentId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOne(SelfHealingAgentResult, {
			where: { agentId, reviewState: 'open' },
			select: ['id', 'projectId', 'baseVersionId', 'applyProgress'],
		});
	}

	async findResult(id: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(SelfHealingAgentResult, { id });
	}

	async getResult(id: string, projectId: string, ctx: OperationContext = {}) {
		const result = await this.table
			.managerFor(ctx)
			.findOneBy(SelfHealingAgentResult, { id, projectId });
		if (!result) throw new NotFoundError('Agent proposal not found.');
		return result;
	}

	async createResult(input: CreateSelfHealingAgentResult, ctx: OperationContext) {
		const manager = this.table.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingAgentResult, {
				...input,
				reviewState: 'open',
				appliedAutomatically: false,
				publishedVersionId: null,
				applyProgress: EMPTY_APPLY_PROGRESS,
				applyError: null,
				applyStartedAt: null,
				closedAt: null,
				closedById: null,
			}),
		);
	}

	/**
	 * Takes the apply claim of an open proposal. Returns false when the proposal is closed
	 * or when another apply holds a claim that is not older than `staleBefore`.
	 */
	async claimApply(id: string, staleBefore: Date, ctx: OperationContext = {}): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(SelfHealingAgentResult)
			.set({ applyStartedAt: new Date() })
			.where(`id = :id AND "reviewState" = 'open' AND ${NO_LIVE_CLAIM}`, { id, staleBefore })
			.execute();
		return result.affected === 1;
	}

	/**
	 * Stores which parts of the proposal are applied. Only the apply that holds the claim calls
	 * this. Returns false when the proposal is not open.
	 */
	async saveApplyProgress(
		id: string,
		{ applyProgress, applyError, releaseClaim }: SaveSelfHealingAgentApplyProgress,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(
				SelfHealingAgentResult,
				{ id, reviewState: 'open' },
				{ applyProgress, applyError, ...(releaseClaim ? { applyStartedAt: null } : {}) },
			);
		return result.affected === 1;
	}

	/** Closes an open proposal and releases the apply claim. Returns false when it cannot. */
	async close(
		id: string,
		reviewState: Exclude<SelfHealingAgentReviewState, 'open'>,
		{ claimStaleBefore, ...optionalFields }: CloseSelfHealingAgentResult,
		ctx: OperationContext = {},
	): Promise<boolean> {
		// The query builder must not get a key with an undefined value.
		const fields = Object.fromEntries(
			Object.entries(optionalFields).filter(([, value]) => value !== undefined),
		);
		const update = this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(SelfHealingAgentResult)
			.set({
				...fields,
				reviewState,
				closedAt: new Date(),
				applyStartedAt: null,
				// A retry that finished makes the stored error of the earlier apply wrong.
				...(reviewState === 'applied' ? { applyError: null } : {}),
			})
			.where('id = :id AND "reviewState" = \'open\'', { id });
		if (claimStaleBefore) update.andWhere(NO_LIVE_CLAIM, { staleBefore: claimStaleBefore });
		const result = await update.execute();
		return result.affected === 1;
	}
}
