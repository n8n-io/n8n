import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Adds a project foreign key to Instance AI threads. Existing threads have no
 * project to backfill from, so all Instance AI data is cleared first — hence
 * irreversible.
 */
const INSTANCE_AI_TABLES = [
	'instance_ai_messages',
	'instance_ai_observations',
	'instance_ai_observation_cursors',
	'instance_ai_observation_locks',
	'instance_ai_iteration_logs',
	'instance_ai_run_snapshots',
	'instance_ai_checkpoints',
	'instance_ai_pending_confirmations',
	'instance_ai_resources',
	'instance_ai_threads',
];

const FK_NAME = 'FK_instance_ai_threads_projectId';
const THREADS_TABLE = 'instance_ai_threads';
const PROJECT_ID_COLUMN = 'projectId';

export class AddProjectIdToInstanceAiThread1784000000026 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await this.clearInstanceAiData(ctx);

		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex },
		} = ctx;

		if (!(await this.hasProjectIdColumn(ctx))) {
			await addColumns(THREADS_TABLE, [
				column(PROJECT_ID_COLUMN)
					.varchar(255)
					.comment('Project a user thread is scoped to; null for internal sub-agent threads'),
			]);
		}

		if (!(await this.hasProjectIdForeignKey(ctx))) {
			await addForeignKey(THREADS_TABLE, PROJECT_ID_COLUMN, ['project', 'id'], FK_NAME, 'CASCADE');
		}

		if (!(await this.hasProjectIdIndex(ctx))) {
			await createIndex(THREADS_TABLE, [PROJECT_ID_COLUMN]);
		}
	}

	private async clearInstanceAiData({ runQuery, escape }: MigrationContext) {
		for (const table of INSTANCE_AI_TABLES) {
			await runQuery(`DELETE FROM ${escape.tableName(table)}`);
		}
	}

	private async getThreadsTable({ queryRunner, tablePrefix }: MigrationContext) {
		return await queryRunner.getTable(`${tablePrefix}${THREADS_TABLE}`);
	}

	private async hasProjectIdColumn(ctx: MigrationContext) {
		const table = await this.getThreadsTable(ctx);
		return table?.columns.some(({ name }) => name === PROJECT_ID_COLUMN) ?? false;
	}

	private async hasProjectIdForeignKey(ctx: MigrationContext) {
		const table = await this.getThreadsTable(ctx);
		const projectTable = `${ctx.tablePrefix}project`;

		return (
			table?.foreignKeys.some(
				({ columnNames, referencedColumnNames, referencedTableName }) =>
					columnNames.includes(PROJECT_ID_COLUMN) &&
					referencedColumnNames.includes('id') &&
					(referencedTableName === 'project' || referencedTableName === projectTable),
			) ?? false
		);
	}

	private async hasProjectIdIndex(ctx: MigrationContext) {
		const table = await this.getThreadsTable(ctx);

		return (
			table?.indices.some(
				({ columnNames, name }) =>
					name === `IDX_${ctx.tablePrefix}${THREADS_TABLE}_${PROJECT_ID_COLUMN}` ||
					(columnNames.length === 1 && columnNames.includes(PROJECT_ID_COLUMN)),
			) ?? false
		);
	}
}
