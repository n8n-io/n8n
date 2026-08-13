import type { MigrationContext, ReversibleMigration } from '../migration-types';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const sourceTypesAfter = [...sourceTypesBefore, 'project_file'];

/**
 * Widens the `binary_data.sourceType` CHECK so project files (the Files
 * feature) can store their bytes in the database when
 * `N8N_FILE_STORAGE_MODE=db`, mirroring how agent knowledge files use the
 * table. `binary_data` has no incoming foreign keys, so the SQLite table
 * recreation behind the constraint swap cannot cascade.
 */
export class AddProjectFileToBinaryDataSourceTypes1786529712198 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} = 'project_file'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
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
