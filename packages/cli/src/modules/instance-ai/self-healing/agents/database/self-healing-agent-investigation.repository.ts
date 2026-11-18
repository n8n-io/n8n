import type { SelfHealingAgentInvestigationOutcome, SelfHealingResultUsage } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull } from '@n8n/typeorm';

import { SelfHealingAgentInvestigation } from './self-healing-agent-investigation.entity';

class SelfHealingAgentInvestigationTable extends BaseRepository<SelfHealingAgentInvestigation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SelfHealingAgentInvestigation, dataSource.manager, transactionRunner);
	}
}

export type CreateSelfHealingAgentInvestigation = Pick<
	SelfHealingAgentInvestigation,
	| 'configurationId'
	| 'projectId'
	| 'agentId'
	| 'backgroundUserId'
	| 'trigger'
	| 'agentVersionId'
	| 'traceWindowStart'
	| 'traceWindowEnd'
	| 'traceCount'
	| 'threadId'
	| 'runId'
>;

export type FinishSelfHealingAgentInvestigation = {
	outcome: Exclude<SelfHealingAgentInvestigationOutcome, 'proposal'>;
	failureReason: string | null;
	usage: SelfHealingResultUsage | null;
};

/** An investigation with one of these outcomes used its trace window. A failed one did not. */
const CONSUMING_OUTCOMES: SelfHealingAgentInvestigationOutcome[] = ['proposal', 'no_change'];

@Service()
export class SelfHealingAgentInvestigationRepository {
	private readonly table: SelfHealingAgentInvestigationTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new SelfHealingAgentInvestigationTable(dataSource, transactionRunner);
	}

	async findInvestigation(id: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(SelfHealingAgentInvestigation, { id });
	}

	async findUnfinishedThreadIds(configurationId: number, ctx: OperationContext): Promise<string[]> {
		const investigations = await this.table.managerFor(ctx).find(SelfHealingAgentInvestigation, {
			where: { configurationId, finishedAt: IsNull() },
			select: { threadId: true },
		});
		return investigations.map(({ threadId }) => threadId);
	}

	async getUnfinishedForAgent(
		agentId: string,
		ctx: OperationContext = {},
	): Promise<{ id: string } | null> {
		const investigation = await this.table.managerFor(ctx).findOne(SelfHealingAgentInvestigation, {
			where: { agentId, finishedAt: IsNull() },
			select: { id: true },
		});
		return investigation ? { id: investigation.id } : null;
	}

	/**
	 * Claims the agent. The insert fails with a unique constraint error when the agent
	 * has an unfinished investigation.
	 */
	async createInvestigation(input: CreateSelfHealingAgentInvestigation, ctx: OperationContext) {
		const manager = this.table.managerFor(ctx);
		return await manager.save(
			manager.create(SelfHealingAgentInvestigation, {
				...input,
				outcome: null,
				failureReason: null,
				usage: null,
				resultId: null,
				finishedAt: null,
			}),
		);
	}

	/** Returns false when the investigation was already finished. */
	async finish(
		id: string,
		{ outcome, failureReason, usage }: FinishSelfHealingAgentInvestigation,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const updated = await this.table
			.managerFor(ctx)
			.update(
				SelfHealingAgentInvestigation,
				{ id, finishedAt: IsNull() },
				{ outcome, failureReason, usage, finishedAt: new Date() },
			);
		return updated.affected === 1;
	}

	async completeWithResult(
		id: string,
		resultId: string,
		usage: SelfHealingResultUsage,
		ctx: OperationContext,
	): Promise<void> {
		const updated = await this.table
			.managerFor(ctx)
			.update(
				SelfHealingAgentInvestigation,
				{ id, finishedAt: IsNull(), resultId: IsNull() },
				{ outcome: 'proposal', failureReason: null, usage, resultId, finishedAt: new Date() },
			);
		if (updated.affected !== 1) {
			throw new ConflictError('The agent investigation has already finished.');
		}
	}

	async listUnfinished() {
		return await this.table.managerFor({}).find(SelfHealingAgentInvestigation, {
			where: { finishedAt: IsNull() },
		});
	}

	/**
	 * The end of the newest trace window that an investigation of this agent used.
	 * The next window starts there, also when another configuration covers the agent now.
	 */
	async getLastConsumingWindowEnd(agentId: string): Promise<Date | null> {
		return (await this.getLastConsuming(agentId))?.traceWindowEnd ?? null;
	}

	/**
	 * The newest investigation of this agent that used its trace window.
	 * The schedule reads it to find out if the agent has anything new to investigate.
	 */
	async getLastConsuming(
		agentId: string,
	): Promise<{ agentVersionId: string; traceWindowEnd: Date } | null> {
		const investigation = await this.table.managerFor({}).findOne(SelfHealingAgentInvestigation, {
			where: { agentId, outcome: In(CONSUMING_OUTCOMES) },
			select: { id: true, agentVersionId: true, traceWindowEnd: true },
			order: { traceWindowEnd: 'DESC' },
		});
		return investigation
			? {
					agentVersionId: investigation.agentVersionId,
					traceWindowEnd: investigation.traceWindowEnd,
				}
			: null;
	}

	/** When the newest failed investigation of this agent finished. */
	async getLastFailedAt(agentId: string): Promise<Date | null> {
		const investigation = await this.table.managerFor({}).findOne(SelfHealingAgentInvestigation, {
			where: { agentId, outcome: 'failed' },
			select: { id: true, finishedAt: true },
			order: { finishedAt: 'DESC' },
		});
		return investigation?.finishedAt ?? null;
	}
}
