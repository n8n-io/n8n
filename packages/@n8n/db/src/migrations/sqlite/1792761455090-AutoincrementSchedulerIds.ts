import { UnexpectedError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tables = ['scheduled_job', 'scheduled_task'];
const rowidKey = '"id" integer PRIMARY KEY NOT NULL';
const autoincrementKey = '"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL';

/**
 * Rebuilds the scheduler tables with AUTOINCREMENT keys. A plain rowid table gives a
 * new row the id of a deleted highest row, so a stale lease holder could match it.
 */
export class AutoincrementSchedulerIds1792761455090 implements ReversibleMigration {
	// The rebuild drops scheduled_job. Disable foreign keys to preserve scheduled_task rows.
	withFKsDisabled = true as const;

	async up(context: MigrationContext) {
		for (const table of tables) await this.rebuild(context, table, rowidKey, autoincrementKey);
	}

	async down(context: MigrationContext) {
		for (const table of tables) await this.rebuild(context, table, autoincrementKey, rowidKey);
	}

	private async rebuild(
		{ runQuery, escape, tablePrefix }: MigrationContext,
		table: string,
		fromKey: string,
		toKey: string,
	) {
		const name = `${tablePrefix}${table}`;
		const tableName = escape.tableName(table);
		const temporaryName = escape.tableName(`temporary_${table}`);
		const [{ sql: definition }] = await runQuery<Array<{ sql: string }>>(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name },
		);
		const indexes = await runQuery<Array<{ sql: string }>>(
			"SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = :name AND sql IS NOT NULL",
			{ name },
		);

		const header = `CREATE TABLE ${tableName} (`;
		if (!definition.startsWith(header) || definition.split(fromKey).length !== 2) {
			throw new UnexpectedError(`Unexpected definition of table ${name}`, {
				extra: { definition },
			});
		}

		await runQuery(
			definition.replace(header, `CREATE TABLE ${temporaryName} (`).replace(fromKey, toKey),
		);
		await runQuery(`INSERT INTO ${temporaryName} SELECT * FROM ${tableName}`);
		await runQuery(`DROP TABLE ${tableName}`);
		await runQuery(`ALTER TABLE ${temporaryName} RENAME TO ${tableName}`);
		for (const { sql } of indexes) await runQuery(sql);
	}
}
