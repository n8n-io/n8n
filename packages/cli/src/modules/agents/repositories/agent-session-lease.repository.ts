import {
	BaseRepository,
	dbNowLiteral,
	dbNowPlusMsLiteral,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentSessionLease } from '../entities/agent-session-lease.entity';

export interface SessionLeaseClaim {
	threadId: string;
	agentId: string;
	executionId: string;
	ownerToken: string;
	ownerHostId: string;
}

export type SessionLeaseAcquisition =
	| { acquired: true; epoch: number; previousExecutionId: string | null }
	| { acquired: false };

@Service()
export class AgentSessionLeaseRepository extends BaseRepository<AgentSessionLease> {
	private readonly isPostgres: boolean;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentSessionLease, dataSource.manager, transactionRunner);
		this.isPostgres = dataSource.options.type === 'postgres';
	}

	/**
	 * Takes the lease of the session when it is free or expired. Runs inside the
	 * transaction that records the execution. On PostgreSQL the caller already
	 * holds the thread row lock, and SQLite serializes writers with
	 * `BEGIN IMMEDIATE`, so two attempts for one session never interleave.
	 */
	async acquire(
		claim: SessionLeaseClaim,
		ttlMs: number,
		ctx: OperationContext,
	): Promise<SessionLeaseAcquisition> {
		const current = await this.managerFor(ctx).findOne(AgentSessionLease, {
			where: { threadId: claim.threadId },
			lock: this.isPostgres ? { mode: 'pessimistic_write' } : undefined,
		});
		if (!current) return await this.insertLease(claim, ttlMs, ctx);
		return await this.takeLease(current, claim, ttlMs, ctx);
	}

	/** Extends the lease. Returns false when another holder took it over. */
	async renew(threadId: string, ownerToken: string, ttlMs: number): Promise<boolean> {
		const result = await this.createQueryBuilder()
			.update(AgentSessionLease)
			.set({ expiresAt: () => dbNowPlusMsLiteral(this.isPostgres, ttlMs) })
			.where({ threadId, ownerToken })
			.execute();
		return result.affected === 1;
	}

	/** Frees the lease and keeps the row, so the epoch of the session only increases. */
	async release(threadId: string, ownerToken: string): Promise<boolean> {
		const result = await this.update(
			{ threadId, ownerToken },
			{ ownerToken: null, ownerHostId: null, executionId: null, expiresAt: null },
		);
		return result.affected === 1;
	}

	private async insertLease(
		claim: SessionLeaseClaim,
		ttlMs: number,
		ctx: OperationContext,
	): Promise<SessionLeaseAcquisition> {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentSessionLease)
			.values({
				...claim,
				epoch: 1,
				expiresAt: () => dbNowPlusMsLiteral(this.isPostgres, ttlMs),
			})
			.orIgnore()
			.execute();
		const inserted = await manager.findOneBy(AgentSessionLease, {
			threadId: claim.threadId,
			ownerToken: claim.ownerToken,
		});
		if (!inserted) return { acquired: false };
		return { acquired: true, epoch: inserted.epoch, previousExecutionId: null };
	}

	private async takeLease(
		current: AgentSessionLease,
		claim: SessionLeaseClaim,
		ttlMs: number,
		ctx: OperationContext,
	): Promise<SessionLeaseAcquisition> {
		const { threadId, ...owner } = claim;
		// No alias on an UPDATE builder, so quote the camelCase columns for
		// PostgreSQL. SQLite accepts the same double-quoted identifiers.
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(AgentSessionLease)
			.set({
				...owner,
				epoch: () => 'epoch + 1',
				expiresAt: () => dbNowPlusMsLiteral(this.isPostgres, ttlMs),
			})
			.where({ threadId, epoch: current.epoch })
			.andWhere(`("ownerToken" IS NULL OR "expiresAt" <= ${dbNowLiteral(this.isPostgres)})`)
			.execute();
		if (result.affected !== 1) return { acquired: false };
		const previousExecutionId = current.ownerToken ? current.executionId : null;
		return { acquired: true, epoch: current.epoch + 1, previousExecutionId };
	}
}
