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

export class AddProjectIdToInstanceAiThread1784000000026 implements IrreversibleMigration {
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
