import { DatabaseConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import { ledgerRow } from './ledger-rows';
import { ExecutionLedgerEntity } from '../database/entities/execution-ledger.entity';
import type { NewExecutionLedgerRow } from '../database/repositories/execution-ledger.repository';

/** A row that this version cannot read, and that the CHECK constraints would refuse. */
export const unknownOutcomeRow = (overrides: Partial<NewExecutionLedgerRow> = {}) =>
	ledgerRow({ event: 'ended', outcome: 'unknown_outcome' as never, ...overrides });

type Check = { name: string; definition: string };

/**
 * Inserts rows that break the CHECK constraints of `execution_ledger`. Call `restore` in
 * `afterEach`: on Postgres the constraints stay dropped until then.
 */
export class LedgerCheckBypass {
	private dropped: Check[] = [];

	private readonly dataSource = Container.get(DataSource);

	private readonly isPostgres = Container.get(DatabaseConfig).type === 'postgresdb';

	private readonly table = this.dataSource.driver.escape(
		this.dataSource.getMetadata(ExecutionLedgerEntity).tableName,
	);

	async insert(row: NewExecutionLedgerRow): Promise<void> {
		if (this.isPostgres) {
			await this.dropChecks();
			await this.append(this.dataSource.manager, row);
			return;
		}

		// The pragma applies to one connection, so it shares a transaction with the insert.
		await this.dataSource.transaction(async (manager) => {
			await manager.query('PRAGMA ignore_check_constraints = ON');
			try {
				await this.append(manager, row);
			} finally {
				await manager.query('PRAGMA ignore_check_constraints = OFF');
			}
		});
	}

	async restore(): Promise<void> {
		if (this.dropped.length === 0) return;

		const { manager } = this.dataSource;
		// Adding a constraint back fails while a row that breaks it remains.
		await manager.query(`DELETE FROM ${this.table}`);
		for (const { name, definition } of this.dropped) {
			await manager.query(`ALTER TABLE ${this.table} ADD CONSTRAINT "${name}" ${definition}`);
		}
		this.dropped = [];
	}

	private async append(manager: EntityManager, row: NewExecutionLedgerRow) {
		await manager.insert(ExecutionLedgerEntity, row);
	}

	private async dropChecks() {
		if (this.dropped.length > 0) return;

		const { manager } = this.dataSource;
		const checks: Check[] = await manager.query(
			'SELECT conname AS "name", pg_get_constraintdef(oid) AS "definition" FROM pg_constraint WHERE conrelid = $1::regclass AND contype = \'c\'',
			[this.table],
		);
		this.dropped = checks;
		for (const { name } of checks) {
			await manager.query(`ALTER TABLE ${this.table} DROP CONSTRAINT "${name}"`);
		}
	}
}
