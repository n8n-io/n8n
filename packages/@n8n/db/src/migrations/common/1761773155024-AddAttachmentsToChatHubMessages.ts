import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	messages: 'chat_hub_messages',
} as const;

export class AddAttachmentsToChatHubMessages1761773155024 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table.messages, [
			column('attachments').json.comment(
				'File attachments for the message (if any), stored as JSON. Files are stored as base64-encoded data URLs.',
			),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table.messages, ['attachments']);
	}
}
