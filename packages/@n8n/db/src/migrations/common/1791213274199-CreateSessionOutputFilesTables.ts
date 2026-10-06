import type { MigrationContext, ReversibleMigration } from '../migration-types';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
	'instance_ai_chat_attachment',
];
const sourceTypesAfter = [
	...sourceTypesBefore,
	'agent_session_output',
	'instance_ai_session_output',
];

export class CreateSessionOutputFilesTables1791213274199 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable('agent_session_output_files')
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('agentId')
					.varchar(36)
					.comment('Agent that produced the file, when persisted (null for inline agents)'),
				column('projectId').varchar(36).notNull.comment('Project owning the conversation'),
				column('threadId').varchar(128).notNull.comment('Session the output file belongs to'),
				column('runId').varchar(128).notNull.comment('Run that last wrote this file'),
				column('writerId')
					.varchar(128)
					.notNull.comment('parent, or the delegated sub-agent thread id'),
				column('fileName').varchar(255).notNull.comment('Relative posix path from the output dir'),
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull,
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference; not an FK to binary_data',
				),
			)
			.withIndexOn(['projectId', 'threadId'])
			.withIndexOn(['threadId', 'fileName'], true)
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

		await createTable('instance_ai_session_output_files')
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('threadId').uuid.notNull.comment('Session the output file belongs to'),
				column('runId').varchar(64).notNull.comment('Run that last wrote this file'),
				column('writerId').varchar(128).notNull.comment('Always parent for Instance AI'),
				column('fileName').varchar(255).notNull.comment('Relative posix path from the output dir'),
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull,
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference; not an FK to binary_data',
				),
			)
			.withIndexOn(['threadId'])
			.withIndexOn(['threadId', 'fileName'], true)
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} IN ('agent_session_output', 'instance_ai_session_output')`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await ctx.schemaBuilder.dropTable('instance_ai_session_output_files');
		await ctx.schemaBuilder.dropTable('agent_session_output_files');
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
