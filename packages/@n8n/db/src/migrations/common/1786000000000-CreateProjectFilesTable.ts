import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PROJECT_FILE_TABLE = 'project_file';
const USER_TABLE = 'user';
const WORKFLOW_TABLE = 'workflow_entity';
const PROJECT_TABLE = 'project';

const binaryDataTableName = 'binary_data';
const sourceTypeColumn = 'sourceType';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const sourceTypesAfter = [...sourceTypesBefore, 'project_file'];

export class CreateProjectFilesTable1786000000000 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column } = ctx.schemaBuilder;

		await createTable(PROJECT_FILE_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('Application-generated n8n nano ID'),
				column('projectId')
					.varchar(36)
					.notNull.comment('Project owning the file; authorization scope for all operations'),
				column('name')
					.varchar(255)
					.notNull.comment('Sanitized display name, unique within the project'),
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull.comment(
					'File size in bytes; capped below 2 GiB by config validation',
				),
				column('binaryDataId').text.notNull.comment(
					'Opaque BinaryDataService reference (mode-prefixed, e.g. "filesystem-v2:<uuid>"). Never leaves the server: /rest/binary-data has no ownership check. Not an FK to binary_data, which only has rows in DB storage mode',
				),
				column('createdById').uuid.comment('User who uploaded the file, when a user did'),
				column('createdByWorkflowId')
					.varchar(36)
					.comment('Workflow that created the file; written once the Project File node exists'),
				column('updatedById').uuid.comment('User who last modified the file, when a user did'),
				column('updatedByWorkflowId')
					.varchar(36)
					.comment(
						'Workflow that last modified the file; written once the Project File node exists',
					),
			)
			// Enforces the name-collision policy: an upload of an existing name is
			// rejected unless it opts into overwriting.
			.withIndexOn(['projectId', 'name'], true)
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// Attribution must survive the actor: deleting a user or workflow never
			// deletes the files they touched.
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('updatedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('createdByWorkflowId', {
				tableName: WORKFLOW_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('updatedByWorkflowId', {
				tableName: WORKFLOW_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(binaryDataTableName)} WHERE ${ctx.escape.columnName(sourceTypeColumn)} = 'project_file'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await ctx.schemaBuilder.dropTable(PROJECT_FILE_TABLE);
	}

	/**
	 * `binary_data.sourceType` carries a CHECK constraint, so `database` binary
	 * mode rejects any value outside it. Project file uploads fail on those
	 * instances without this.
	 */
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
