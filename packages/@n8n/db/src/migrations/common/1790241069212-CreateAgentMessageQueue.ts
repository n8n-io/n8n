import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentMessageQueue1790241069212 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, createIndex, column },
		escape,
		isSqlite,
	}: MigrationContext) {
		// SQLite needs AUTOINCREMENT to prevent ID reuse after queue rows are deleted.
		const id = isSqlite
			? column('id').int.primary.autoGenerate
			: column('id').bigint.primary.autoGenerate2;
		await createTable('agent_message_queue')
			.withColumns(
				id.comment('Acceptance order; IDs are not reused'),
				column('threadId').varchar(128).notNull,
				column('source').varchar(32).notNull.comment('Preview or integration source'),
				column('payload').json.notNull.comment(
					'Input, attachment references, identity, and reply context',
				),
				column('executionId').varchar(36).comment('Current execution; NULL means pending'),
			)
			.withForeignKey('threadId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'NO ACTION',
			})
			.withIndexOn(['threadId', 'id'])
			.withIndexOn('executionId').withTimestamps;
		await createIndex(
			'agent_message_queue',
			['threadId'],
			true,
			undefined,
			`${escape.columnName('executionId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_message_queue');
	}
}
