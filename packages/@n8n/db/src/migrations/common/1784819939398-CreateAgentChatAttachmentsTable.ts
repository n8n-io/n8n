import type { MigrationContext, ReversibleMigration } from '../migration-types';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = ['execution', 'chat_message_attachment', 'agent_file'];
const sourceTypesAfter = [...sourceTypesBefore, 'agent_chat_attachment'];

export class CreateAgentChatAttachmentsTable1784819939398 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable('agent_chat_attachments')
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				// FK to agents.id, which is declared varchar(36); the column type
				// mirrors the referenced primary key. Nullable: inline agents have
				// no agents row, so their attachments scope by projectId + threadId.
				column('agentId')
					.varchar(36)
					.comment('Agent the attachment was sent to, when persisted'),
				column('projectId')
					.varchar(36)
					.notNull.comment('Project owning the conversation; authorization scope for downloads'),
				// Thread ids are scoped with prefixes/user ids on some surfaces
				// (e.g. `test-<agentId>:<userId>`) — same width as agent_execution.threadId.
				column('threadId')
					.varchar(128)
					.notNull.comment('Conversation thread the file belongs to'),
				column('resourceId')
					.varchar(255)
					.comment('Per-user scope within the thread (platform user), when known'),
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference (mode-prefixed, e.g. "filesystem-v2:<uuid>"); not an FK to binary_data, which only has rows in DB storage mode',
				),
				column('fileName').varchar(255).notNull,
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull.comment('Uploaded file size in bytes'),
				column('source')
					.varchar(32)
					.notNull.comment('Surface the file arrived from, e.g. "chat", "slack", "telegram"'),
			)
			.withIndexOn(['projectId', 'threadId'])
			.withIndexOn(['agentId', 'threadId'])
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} = 'agent_chat_attachment'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await ctx.schemaBuilder.dropTable('agent_chat_attachments');
	}

	private async replaceSourceTypeCheck(
		{ schemaBuilder: { addEnumCheck, dropEnumCheck } }: MigrationContext,
		sourceTypes: string[],
	) {
		await dropEnumCheck(binaryDataTableName, sourceTypeColumn, { recreatesOnSqlite: true });
		await addEnumCheck(binaryDataTableName, sourceTypeColumn, sourceTypes, {
			recreatesOnSqlite: true,
		});
	}
}
