import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Binds every Instance AI thread to an n8n project via a NOT NULL `projectId`
 * foreign key. Existing threads predate project scoping and have no project to
 * backfill from, so all Instance AI conversation data is cleared rather than
 * migrated — hence irreversible. New threads receive their project at creation.
 *
 * Child tables are emptied before `instance_ai_threads` so the wipe doesn't
 * depend on FK cascade behaviour being present (or matching) across engines.
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

export class AddProjectIdToInstanceAiThread1784000000022 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await this.clearInstanceAiData(ctx);

		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex },
		} = ctx;

		await addColumns('instance_ai_threads', [
			column('projectId')
				.varchar(255)
				.comment('Project a user thread is scoped to; null for internal sub-agent threads'),
		]);
		await addForeignKey('instance_ai_threads', 'projectId', ['project', 'id'], FK_NAME, 'CASCADE');
		await createIndex('instance_ai_threads', ['projectId']);
	}

	private async clearInstanceAiData({ runQuery, escape }: MigrationContext) {
		for (const table of INSTANCE_AI_TABLES) {
			await runQuery(`DELETE FROM ${escape.tableName(table)}`);
		}
	}
}
