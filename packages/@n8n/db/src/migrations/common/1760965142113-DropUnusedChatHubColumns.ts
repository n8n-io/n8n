import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	messages: 'chat_hub_messages',
} as const;

export class DropUnusedChatHubColumns1760965142113 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns, addColumns, column } }: MigrationContext) {
		await dropColumns(table.messages, ['turnId', 'runIndex', 'state'], {
			ackThisRecreatesOnSqlite: true,
		});
		await addColumns(
			table.messages,
			[
				column('status')
					.varchar(16)
					.default("'success'")
					.notNull.comment(
						'ChatHubMessageStatus enum, eg. "success", "error", "running", "cancelled"',
					),
			],
			{ ackThisRecreatesOnSqlite: true },
		);
	}

	async down({
		schemaBuilder: { dropColumns, addColumns, column, addForeignKey },
	}: MigrationContext) {
		await dropColumns(table.messages, ['status'], { ackThisRecreatesOnSqlite: true });
		await addColumns(
			table.messages,
			[
				column('turnId').uuid,
				column('runIndex')
					.int.notNull.default(0)
					.comment('The nth attempt this message has been generated/retried this turn'),
				column('state')
					.varchar(16)
					.default("'active'")
					.notNull.comment('ChatHubMessageState enum: "active", "superseded", "hidden", "deleted"'),
			],
			{ ackThisRecreatesOnSqlite: true },
		);
		await addForeignKey(table.messages, 'turnId', [table.messages, 'id'], undefined, 'CASCADE');
	}
}
