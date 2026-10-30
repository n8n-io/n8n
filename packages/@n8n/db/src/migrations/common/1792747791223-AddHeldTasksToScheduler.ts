import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const taskTable = 'scheduled_task';
const kindColumn = 'kind';
const kindValuesBefore = ['cron', 'interval', 'one_off', 'recurring_cron'];
const kindValues = [...kindValuesBefore, 'hold'];
const modeValues = ['once', 'hold'];

/**
 * Adds held tasks to the scheduler:
 *   - the `hold` job kind,
 *   - `leaseSeconds` on `scheduled_job` and the copy each task takes of it,
 *   - `mode` on `scheduled_task`, so the claim and the reaper know a held task without a join,
 *   - `heldSince` on `scheduled_task`, set while a holder keeps the task.
 */
export class AddHeldTasksToScheduler1792747791223 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { runQuery, escape, tablePrefix, isPostgres, queryRunner } = context;
		const task = escape.tableName(taskTable);
		const leaseSeconds = escape.columnName('leaseSeconds');
		const mode = escape.columnName('mode');
		const heldSince = escape.columnName('heldSince');
		const timestamp = isPostgres ? 'timestamptz(3)' : 'datetime(3)';
		const modeList = modeValues.map((value) => `'${value}'`).join(', ');

		const addColumn = async (table: string, column: string, definition: string, check: string) => {
			const name = `"CHK_${tablePrefix}${table}_${column}"`;
			const tableName = escape.tableName(table);
			const addition = `ALTER TABLE ${tableName} ADD COLUMN ${escape.columnName(column)} ${definition}`;
			if (!isPostgres) {
				await runQuery(`${addition} CONSTRAINT ${name} CHECK (${check})`);
				return;
			}
			// NOT VALID skips the scan of existing rows under the exclusive lock. Each of
			// them holds the default or NULL, which the CHECK accepts.
			await runQuery(addition);
			await runQuery(`ALTER TABLE ${tableName} ADD CONSTRAINT ${name} CHECK (${check}) NOT VALID`);
		};

		await addColumn(jobTable, 'leaseSeconds', 'int', `${leaseSeconds} > 0`);
		await addColumn(taskTable, 'leaseSeconds', 'int', `${leaseSeconds} > 0`);
		await addColumn(
			taskTable,
			'mode',
			"varchar(16) NOT NULL DEFAULT 'once'",
			`${mode} IN (${modeList})`,
		);
		await runQuery(`ALTER TABLE ${task} ADD COLUMN ${heldSince} ${timestamp}`);

		if (context.isSqlite) {
			await queryRunner.getTable(`${tablePrefix}${jobTable}`);
		}
		await context.schemaBuilder.dropEnumCheck(jobTable, kindColumn, { recreatesOnSqlite: true });
		await context.schemaBuilder.addEnumCheck(jobTable, kindColumn, kindValues, {
			recreatesOnSqlite: true,
		});
	}

	async down(context: MigrationContext) {
		const { runQuery, escape, tablePrefix, queryRunner, schemaBuilder } = context;
		const job = escape.tableName(jobTable);
		const task = escape.tableName(taskTable);

		await runQuery(
			`DELETE FROM ${task} WHERE ${escape.columnName('jobId')} IN ` +
				`(SELECT ${escape.columnName('id')} FROM ${job} WHERE ${escape.columnName(kindColumn)} = 'hold')`,
		);
		await runQuery(`DELETE FROM ${job} WHERE ${escape.columnName(kindColumn)} = 'hold'`);

		await schemaBuilder.dropEnumCheck(jobTable, kindColumn, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(jobTable, kindColumn, kindValuesBefore, {
			recreatesOnSqlite: true,
		});

		for (const [table, checks, columns] of [
			[jobTable, ['leaseSeconds'], ['leaseSeconds']],
			[taskTable, ['leaseSeconds', 'mode'], ['leaseSeconds', 'mode', 'heldSince']],
		] as const) {
			await queryRunner.getTable(`${tablePrefix}${table}`);
			for (const check of checks) {
				await queryRunner.dropCheckConstraint(
					`${tablePrefix}${table}`,
					`CHK_${tablePrefix}${table}_${check}`,
				);
			}
			for (const column of columns) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(column)}`,
				);
			}
		}
	}
}
