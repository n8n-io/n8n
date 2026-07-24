import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAttachmentsToAgentExecution1784820682891 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('attachments').json.comment(
					'Metadata of files attached to the user turn ({id, fileName, mimeType, sizeBytes}[]); bytes live in BinaryDataService',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_execution', ['attachments'], { recreatesOnSqlite: true });
	}
}
