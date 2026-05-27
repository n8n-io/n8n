import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = ['execution', 'chat_message_attachment'];
const sourceTypesAfter = [...sourceTypesBefore, 'agent_file'];

export class CreateAgentFilesTable1784000000016 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable('agent_files')
			.withColumns(
				column('id')
					.varchar(36)
					.primary.notNull.comment('Application-generated n8n string ID, not a database UUID'),
				column('agentId').varchar(36).notNull.comment('Agent that owns this uploaded file'),
				column('binaryDataId').text.notNull.comment(
					'BinaryDataService ID for the uploaded file contents',
				),
				column('fileName').varchar(255).notNull,
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull.comment('Uploaded file size in bytes'),
			)
			.withIndexOn(['agentId', 'createdAt'])
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} = 'agent_file'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await ctx.schemaBuilder.dropTable('agent_files');
	}

	private async replaceSourceTypeCheck(
		{ schemaBuilder: { dropEnumCheck }, queryRunner, tablePrefix }: MigrationContext,
		sourceTypes: string[],
	) {
		await dropEnumCheck(binaryDataTableName, sourceTypeColumn);
		const escapedValues = sourceTypes.map((sourceType) => `'${sourceType}'`).join(', ');
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${binaryDataTableName}`,
			new TableCheck({
				name: `CHK_${tablePrefix}${binaryDataTableName}_${sourceTypeColumn}`,
				expression: `${queryRunner.connection.driver.escape(sourceTypeColumn)} IN (${escapedValues})`,
			}),
		);
	}
}
