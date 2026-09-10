import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'instance_ai_threads';
const FOREIGN_KEY_NAME = 'instance_ai_threads_appId_foreign';

/**
 * The app a thread builds. The app page resumes the newest thread with its id
 * and lists the others as that app's history, so the lookup is by app, newest
 * first. Deleting an app keeps the conversation and only unlinks it.
 */
export class AddAppIdToInstanceAiThread1789049263996 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, createIndex, column },
	}: MigrationContext) {
		await addColumns(
			TABLE,
			[column('appId').varchar(36).comment('App this thread builds; null for other threads')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(TABLE, 'appId', ['app', 'id'], FOREIGN_KEY_NAME, 'SET NULL');
		await createIndex(TABLE, ['appId', 'updatedAt']);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey, dropIndex } }: MigrationContext) {
		await dropIndex(TABLE, ['appId', 'updatedAt']);
		await dropForeignKey(TABLE, 'appId', ['app', 'id'], FOREIGN_KEY_NAME);
		await dropColumns(TABLE, ['appId'], { recreatesOnSqlite: true });
	}
}
