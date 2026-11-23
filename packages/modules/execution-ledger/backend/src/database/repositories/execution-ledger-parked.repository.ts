import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLedgerParkedEntity } from '../entities/execution-ledger-parked.entity';
import { coerceLedgerRow, type RawLedgerRow } from '../ledger-row.parser';

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

	/** Parks the rows that no step can read, so no step name applies. */
	async parkUnreadable(rows: readonly RawLedgerRow[], ctx: OperationContext): Promise<void> {
		await this.park(UNREADABLE_ROWS_STEP, rows, 'Ledger row has an unexpected value', ctx);
	}

	/**
	 * Pass the fold transaction in `ctx`, so the rows are parked only if the claim commits.
	 * A row already parked for the step keeps its first park, so a repeat park cannot block the fold.
	 */
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
			const values = rows.slice(offset, offset + INSERT_CHUNK_SIZE).map((row) => {
				const { id: ledgerId, ...ledgerValues } = coerceLedgerRow(row);
				return { ...ledgerValues, ledgerId, step, error: parkedError, parkedAt };
			});
			await manager
				.createQueryBuilder()
				.insert()
				.into(ExecutionLedgerParkedEntity)
				.values(values)
				// Both drivers render ON CONFLICT DO NOTHING, which skips unique conflicts only.
				.orIgnore()
				.updateEntity(false)
				.execute();
		}
	}
}
