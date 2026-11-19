import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Read grants on agent files. A parent thread grants a file to the sub-agent
 * thread that it delegates to. The sub-agent can then grant the file to its
 * own sub-agents.
 *
 * The key is the pair, so a grant lookup uses the primary key. A grant goes
 * with its file. `threadId` has no foreign key: inline agents have no thread
 * rows, as for `agent_chat_attachments.threadId`.
 */
export class CreateAgentFileGrantsTable1793118209500 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_file_grants')
			.withColumns(
				column('attachmentId').varchar(16).primary.comment('Granted file'),
				column('threadId').varchar(128).primary.comment('Thread that can read the file'),
			)
			.withForeignKey('attachmentId', {
				tableName: 'agent_chat_attachments',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_file_grants');
	}
}
