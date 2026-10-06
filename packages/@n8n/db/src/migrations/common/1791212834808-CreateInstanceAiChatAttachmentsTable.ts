import type { MigrationContext, ReversibleMigration } from '../migration-types';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const sourceTypesAfter = [...sourceTypesBefore, 'instance_ai_chat_attachment'];

export class CreateInstanceAiChatAttachmentsTable1791212834808 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable('instance_ai_chat_attachments')
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('threadId').uuid.notNull.comment('Session the attachment belongs to'),
				column('messageId')
					.varchar(36)
					.comment('User message that introduced the file, when known'),
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference; not an FK to binary_data',
				),
				column('fileName').varchar(255).notNull,
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull.comment('Uploaded file size in bytes'),
			)
			.withIndexOn(['threadId'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} = 'instance_ai_chat_attachment'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await ctx.schemaBuilder.dropTable('instance_ai_chat_attachments');
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
