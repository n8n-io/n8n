import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentMessageQueuePosition1790853539575 implements ReversibleMigration {
	async up({
		schemaBuilder,
		escape,
		runQuery,
		isSqlite,
		queryRunner,
		tablePrefix,
	}: MigrationContext) {
		const { addColumns, column, createIndex, dropIndex } = schemaBuilder;
		const table = escape.tableName('agent_message_queue');
		const id = escape.columnName('id');
		const threadId = escape.columnName('threadId');
		const position = escape.columnName('position');
		if (isSqlite) {
			// Keep the AUTOINCREMENT sequence, including IDs of deleted rows.
			await runQuery(`ALTER TABLE ${table} ADD COLUMN ${position} integer NOT NULL DEFAULT 0`);
		} else {
			await addColumns(
				'agent_message_queue',
				[
					column('position')
						.int.notNull.default(0)
						.comment('Pending turn order within the session'),
				],
				{ recreatesOnSqlite: true },
			);
		}
		await runQuery(`
			UPDATE ${table} AS queue SET ${position} = ordered.${position}
			FROM (
				SELECT ${id}, ROW_NUMBER() OVER (PARTITION BY ${threadId} ORDER BY ${id}) - 1 AS ${position}
				FROM ${table}
			) AS ordered
			WHERE queue.${id} = ordered.${id}
		`);
		await dropIndex('agent_message_queue', ['threadId', 'id'], {
			customIndexName: queryRunner.connection.namingStrategy.indexName(
				`${tablePrefix}agent_message_queue`,
				['threadId', 'id'],
			),
		});
		await createIndex('agent_message_queue', ['threadId', 'position']);
	}

	async down({
		schemaBuilder: { dropIndex, dropColumns, createIndex },
		escape,
		runQuery,
		isSqlite,
		queryRunner,
		tablePrefix,
	}: MigrationContext) {
		await dropIndex('agent_message_queue', ['threadId', 'position']);
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_message_queue')} DROP COLUMN ${escape.columnName('position')}`,
			);
		} else {
			await dropColumns('agent_message_queue', ['position'], { recreatesOnSqlite: true });
		}
		await createIndex(
			'agent_message_queue',
			['threadId', 'id'],
			false,
			queryRunner.connection.namingStrategy.indexName(`${tablePrefix}agent_message_queue`, [
				'threadId',
				'id',
			]),
		);
	}
}
