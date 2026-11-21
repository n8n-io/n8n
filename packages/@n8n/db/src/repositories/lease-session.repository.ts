import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { LeaseSession } from '../entities';
import { dbNowPlusMsLiteral } from '../utils/dialect-time';
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

	async deleteSession(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(LeaseSession, { id });
	}
}
