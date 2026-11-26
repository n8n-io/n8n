import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLimitAudit } from './execution-limit-audit.entity';
import type { RecordedExecutionLimitChange } from './execution-limits.types';

const SQLITE_SAFE_INSERT_BATCH_SIZE = 5_000;

class ExecutionLimitAuditTable extends BaseRepository<ExecutionLimitAudit> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLimitAudit, dataSource.manager, transactionRunner);
	}
}

@Service()
export class ExecutionLimitAuditRepository {
	private readonly table: ExecutionLimitAuditTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ExecutionLimitAuditTable(dataSource, transactionRunner);
	}

	async append(changes: RecordedExecutionLimitChange[], ctx: OperationContext): Promise<void> {
		const manager = this.table.managerFor(ctx);

		for (let start = 0; start < changes.length; start += SQLITE_SAFE_INSERT_BATCH_SIZE) {
			await manager
				.createQueryBuilder()
				.insert()
				.into(ExecutionLimitAudit)
				.values(changes.slice(start, start + SQLITE_SAFE_INSERT_BATCH_SIZE))
				.updateEntity(false)
				.execute();
		}
	}
}
