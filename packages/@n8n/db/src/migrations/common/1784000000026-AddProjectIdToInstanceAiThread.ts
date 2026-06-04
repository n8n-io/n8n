import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a project foreign key to Instance AI threads and backfills each existing
 * user thread with its owner's personal project. Sub-agent and orphaned threads
 * have no matching personal project, so they keep a null binding.
 */
const FK_NAME = 'FK_instance_ai_threads_projectId';
const THREADS_TABLE = 'instance_ai_threads';
const PROJECT_ID_COLUMN = 'projectId';

export class AddProjectIdToInstanceAiThread1784000000026 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
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

		await this.backfillPersonalProjects(ctx);

		if (!(await this.hasProjectIdForeignKey(ctx))) {
			await addForeignKey(THREADS_TABLE, PROJECT_ID_COLUMN, ['project', 'id'], FK_NAME, 'CASCADE');
		}

		if (!(await this.hasProjectIdIndex(ctx))) {
			await createIndex(THREADS_TABLE, [PROJECT_ID_COLUMN]);
		}
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { dropIndex, dropForeignKey, dropColumns },
		} = ctx;

		if (await this.hasProjectIdIndex(ctx)) {
			await dropIndex(THREADS_TABLE, [PROJECT_ID_COLUMN], { skipIfMissing: true });
		}
		if (await this.hasProjectIdForeignKey(ctx)) {
			await dropForeignKey(THREADS_TABLE, PROJECT_ID_COLUMN, ['project', 'id'], FK_NAME);
		}
		if (await this.hasProjectIdColumn(ctx)) {
			await dropColumns(THREADS_TABLE, [PROJECT_ID_COLUMN]);
		}
	}

	/**
	 * Existing threads predate project scoping. A user thread's `resourceId` is its
	 * owner's user id, so bind each to that user's personal project. Only null
	 * bindings are filled — a re-run never overwrites a real binding — and threads
	 * with no matching personal project (sub-agent or orphaned) stay null.
	 */
	private async backfillPersonalProjects({ runQuery, escape }: MigrationContext) {
		const threads = escape.tableName(THREADS_TABLE);
		const relation = escape.tableName('project_relation');
		const projectId = escape.columnName(PROJECT_ID_COLUMN);
		const resourceId = escape.columnName('resourceId');
		const userId = escape.columnName('userId');
		const role = escape.columnName('role');

		// `project:personalOwner` is the relation role used only for personal projects.
		await runQuery(
			`UPDATE ${threads}
			 SET ${projectId} = (
				 SELECT pr.${projectId}
				 FROM ${relation} pr
				 WHERE pr.${userId} = ${threads}.${resourceId}
					 AND pr.${role} = 'project:personalOwner'
				 LIMIT 1
			 )
			 WHERE ${projectId} IS NULL
				 AND ${resourceId} IN (
					 SELECT ${userId} FROM ${relation} WHERE ${role} = 'project:personalOwner'
				 )`,
		);
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
