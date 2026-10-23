import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import type { HostedClaimedRef } from './scheduled-task.repository';
import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { dbNowLiteral } from '../utils/dialect-time';

class HeldTaskTable extends BaseRepository<ScheduledTask> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ScheduledTask, dataSource.manager, transactionRunner);
	}
}

/** Checks inside a caller's transaction that a held task still belongs to a claim. */
@Service()
export class HeldTaskFenceRepository {
	private readonly table: HeldTaskTable;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		this.table = new HeldTaskTable(dataSource, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/**
	 * Whether `claim` still holds its task: the same lease epoch, still `running`,
	 * claimed by `claim.host`, and the lease not expired on the database clock.
	 *
	 * On Postgres the row stays locked for share until the transaction ends, so a
	 * reclaim or a new claim cannot commit before the caller's own writes. SQLite
	 * runs every transaction on its one write connection, with the same effect.
	 */
	async isHeld(claim: HostedClaimedRef, ctx: OperationContext): Promise<boolean> {
		if (!ctx.trx) {
			throw new UnexpectedError('A held task fence must be checked inside a transaction');
		}

		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(ScheduledTask, 'task')
			.select('task.id')
			.where({
				id: claim.id,
				status: ScheduledTaskStatus.Running,
				claimedBy: claim.host,
				leaseEpoch: claim.claimedEpoch,
			})
			.andWhere(`task.leaseExpiresAt > ${dbNowLiteral(this.isPostgres)}`);
		if (this.isPostgres) query.setLock('pessimistic_read');

		return (await query.getRawOne()) !== undefined;
	}
}
