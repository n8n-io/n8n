import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { LeaseSession } from '../entities';
import { dbNowLiteral, dbNowPlusMsLiteral } from '../utils/dialect-time';
import { BaseRepository } from './base-repository';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class LeaseSessionTable extends BaseRepository<LeaseSession> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(LeaseSession, dataSource.manager, transactionRunner);
	}
}

export interface NewLeaseSession {
	id: string;
	leaseKind: string;
	hostId: string;
	bootId: string;
	leaseDurationSeconds: number;
}

@Service()
export class LeaseSessionRepository {
	private readonly table: LeaseSessionTable;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		this.table = new LeaseSessionTable(dataSource, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/** Inserts a session that expires one lease duration after the database time. */
	async insertSession(session: NewLeaseSession, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(LeaseSession)
			.values({
				...session,
				expiresAt: () => dbNowPlusMsLiteral(this.isPostgres, session.leaseDurationSeconds * 1000),
			})
			.execute();
	}

	/** Extends an unexpired session and returns true; returns false, without extending, when it expired or is gone. */
	async renewLive(
		id: string,
		leaseDurationSeconds: number,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(LeaseSession)
			.set({
				expiresAt: () => dbNowPlusMsLiteral(this.isPostgres, leaseDurationSeconds * 1000),
			})
			.where(`id = :id AND "expiresAt" > ${dbNowLiteral(this.isPostgres)}`, { id })
			.execute();
		return result.affected === 1;
	}

	async deleteSession(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(LeaseSession, { id });
	}
}
