import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { TriggerRunner } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { dbNowLiteral, dbNowPlusMsLiteral } from '../utils/dialect-time';

/** Liveness registry of instances eligible to hold trigger seats. */
@Service()
export class TriggerRunnerRepository extends BaseRepository<TriggerRunner> {
	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		super(TriggerRunner, dataSource.manager, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	async heartbeat(runnerId: string, ctx: OperationContext = {}): Promise<void> {
		const now = dbNowLiteral(this.isPostgres);
		await this.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(TriggerRunner)
			.values({
				runnerId,
				lastHeartbeatAt: () => now,
			} as QueryDeepPartialEntity<TriggerRunner>)
			.orUpdate(['lastHeartbeatAt'], ['runnerId'])
			.execute();
	}

	/** Runner ids whose heartbeat is within `ttlMs`, sorted for determinism. */
	async findLiveRunnerIds(ttlMs: number, ctx: OperationContext = {}): Promise<string[]> {
		const rows: Array<{ runnerId: string }> = await this.managerFor(ctx)
			.createQueryBuilder(TriggerRunner, 'runner')
			.select('runner.runnerId', 'runnerId')
			.where(`runner.lastHeartbeatAt > ${dbNowPlusMsLiteral(this.isPostgres, -ttlMs)}`)
			.orderBy('runner.runnerId', 'ASC')
			.getRawMany();
		return rows.map((row) => row.runnerId);
	}
}
