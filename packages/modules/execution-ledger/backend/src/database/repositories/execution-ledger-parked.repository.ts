import { BaseRepository, type OperationContext, parseDbTime, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLedgerParkedEntity } from '../entities/execution-ledger-parked.entity';
import type { RawLedgerRow } from '../ledger-row.parser';

/** Step name of the rows that no step could read. The step name pattern rejects it. */
export const UNREADABLE_ROWS_STEP = '_unreadable';

/** Keeps one insert far below the Postgres limit of 65,535 parameters. */
const INSERT_CHUNK_SIZE = 500;

const ERROR_MAX_LENGTH = 255;

class ExecutionLedgerParkedTable extends BaseRepository<ExecutionLedgerParkedEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLedgerParkedEntity, dataSource.manager, transactionRunner);
	}
}

/** The only reader and writer of `execution_ledger_parked`. */
@Service()
export class ExecutionLedgerParkedRepository {
	private readonly table: ExecutionLedgerParkedTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ExecutionLedgerParkedTable(dataSource, transactionRunner);
	}

	/** Pass the fold transaction in `ctx`, so the rows are parked only if the claim commits. */
	async park(
		step: string,
		rows: readonly RawLedgerRow[],
		error: string,
		ctx: OperationContext,
	): Promise<void> {
		if (!ctx.trx) throw new UnexpectedError('Parking ledger rows needs an active transaction');

		const parkedAt = new Date();
		const parkedError = error.slice(0, ERROR_MAX_LENGTH);
		const manager = this.table.managerFor(ctx);

		for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
			const values = rows
				.slice(offset, offset + INSERT_CHUNK_SIZE)
				.map((row) => ({ ...toParkedValues(row), step, error: parkedError, parkedAt }));
			await manager
				.createQueryBuilder()
				.insert()
				.into(ExecutionLedgerParkedEntity)
				.values(values)
				.updateEntity(false)
				.execute();
		}
	}
}

function toParkedValues(raw: RawLedgerRow) {
	return {
		ledgerId: String(raw.id),
		executionId: String(raw.executionId),
		occurredAt: toDate(raw.occurredAt),
		entityType: String(raw.entityType),
		entityName: String(raw.entityName),
		entityId: String(raw.entityId),
		projectId: String(raw.projectId),
		mode: String(raw.mode),
		source: String(raw.source),
		event: String(raw.event),
		outcome: String(raw.outcome),
		blockedBy: String(raw.blockedBy),
		runtimeMs: Number(raw.runtimeMs),
		timeSavedMin: Number(raw.timeSavedMin),
		origin: String(raw.origin),
		eventId: String(raw.eventId),
	};
}

// A time that no driver returns becomes the epoch: a throw here would block the fold.
function toDate(value: unknown): Date {
	return value instanceof Date || typeof value === 'string' ? parseDbTime(value) : new Date(0);
}
