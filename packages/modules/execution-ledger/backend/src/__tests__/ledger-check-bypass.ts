import { DatabaseConfig } from '@n8n/config';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { ledgerRow } from './ledger-rows';
import {
	ExecutionLedgerRepository,
	type NewExecutionLedgerRow,
} from '../database/repositories/execution-ledger.repository';

/** A row that this version cannot read, and that the CHECK constraints would refuse. */
export const unknownOutcomeRow = (overrides: Partial<NewExecutionLedgerRow> = {}) =>
	ledgerRow({ event: 'ended', outcome: 'unknown_outcome' as never, ...overrides });

/**
 * Inserts rows that break the CHECK constraints of `execution_ledger`. Call `restore` in
 * `afterEach`: on Postgres the constraints stay dropped until then.
 */
export class LedgerCheckBypass {
	private dropped: Array<{ name: string; definition: string }> = [];

	private readonly repository = Container.get(ExecutionLedgerRepository);

	private readonly isPostgres = Container.get(DatabaseConfig).type === 'postgresdb';

	async insert(row: NewExecutionLedgerRow): Promise<void> {
		if (this.isPostgres) {
			await this.dropChecks();
			await this.repository.append(row, {});
			return;
		}

		// The pragma applies to one connection, so it shares a transaction with the insert.
		await Container.get(TransactionRunner).run({}, async (ctx) => {
			const manager = this.repository['table'].managerFor(ctx);
			await manager.query('PRAGMA ignore_check_constraints = ON');
			try {
				await this.repository.append(row, ctx);
			} finally {
				await manager.query('PRAGMA ignore_check_constraints = OFF');
			}
		});
	}

	async restore(): Promise<void> {
		if (this.dropped.length === 0) return;

		const manager = this.repository['table'].managerFor({});
		const table = this.escapedTable();
		// Adding a constraint back fails while a row that breaks it remains.
		await manager.query(`DELETE FROM ${table}`);
		for (const { name, definition } of this.dropped) {
			await manager.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} ${definition}`);
		}
		this.dropped = [];
	}

	private async dropChecks() {
		if (this.dropped.length > 0) return;

		const manager = this.repository['table'].managerFor({});
		const table = this.escapedTable();
		const checks: Array<{ name: string; definition: string }> = await manager.query(
			'SELECT conname AS "name", pg_get_constraintdef(oid) AS "definition" FROM pg_constraint WHERE conrelid = $1::regclass AND contype = \'c\'',
			[table],
		);
		this.dropped = checks.map((check) => ({ ...check, name: `"${check.name}"` }));
		for (const { name } of this.dropped) {
			await manager.query(`ALTER TABLE ${table} DROP CONSTRAINT ${name}`);
		}
	}

	private escapedTable() {
		const manager = this.repository['table'].managerFor({});
		return manager.connection.driver.escape(this.repository['table'].metadata.tableName);
	}
}
