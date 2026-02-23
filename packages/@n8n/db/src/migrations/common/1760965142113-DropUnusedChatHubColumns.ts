import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	messages: 'chat_hub_messages',
} as const;

export class DropUnusedChatHubColumns1760965142113 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns, addColumns, column } }: MigrationContext) {
		await dropColumns(table.messages, ['turnId', 'runIndex', 'state']);
		await addColumns(table.messages, [
			column('status')
				.varchar(16)
				.default("'success'")
				.notNull.comment(
					'ChatHubMessageStatus enum, eg. "success", "error", "running", "cancelled"',
				),
		]);
	}

	async down({
		schemaBuilder: { dropColumns, addColumns, column, addForeignKey },
	}: MigrationContext) {
		await dropColumns(table.messages, ['status']);
		await addColumns(table.messages, [
			column('turnId').uuid,
			column('runIndex')
				.int.notNull.default(0)
				.comment('The nth attempt this message has been generated/retried this turn'),
			column('state')
				.varchar(16)
				.default("'active'")
				.notNull.comment('ChatHubMessageState enum: "active", "superseded", "hidden", "deleted"'),
		]);
		await addForeignKey(table.messages, 'turnId', [table.messages, 'id'], undefined, 'CASCADE');
	}
}
