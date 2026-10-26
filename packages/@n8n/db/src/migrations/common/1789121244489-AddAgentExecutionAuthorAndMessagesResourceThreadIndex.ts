import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Shared integration threads: each turn records its author, and episodic
 * memory recall lists the threads a resource has posted in. `agents_messages`
 * was only indexed by thread, so that lookup scanned every message.
 */
export class AddAgentExecutionAuthorAndMessagesResourceThreadIndex1789121244489
	implements ReversibleMigration
{
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, createIndex },
	}: MigrationContext) {
		// The schema builder rebuilds the table on SQLite.
		// Add this nullable column in place.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_execution')} ADD COLUMN ${escape.columnName('author')} text`,
			);
		} else {
			await addColumns(
				'agent_execution',
				[
					column('author').json.comment(
						'Chat platform user who wrote the turn as {id, name}; null for runs outside chat integrations',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}
		await createIndex('agents_messages', ['resourceId', 'threadId']);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, dropIndex },
	}: MigrationContext) {
		await dropIndex('agents_messages', ['resourceId', 'threadId']);
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_execution')} DROP COLUMN ${escape.columnName('author')}`,
			);
		} else {
			await dropColumns('agent_execution', ['author'], { recreatesOnSqlite: true });
		}
	}
}
