import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';
const BINARY_DATA_TABLE = 'binary_data';
const SOURCE_TYPE_COLUMN = 'sourceType';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const sourceTypesAfter = [...sourceTypesBefore, 'app_version'];

/**
 * A built version of an App: a source tarball and, while retained, a dist
 * tarball. Bytes live in blob storage; the row records where.
 */
export class CreateAppVersionTable1788802053380 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, addColumns, column } = ctx.schemaBuilder;

		await createTable(APP_VERSION_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('appId').varchar(36).notNull,
				column('storedAt')
					.varchar(8)
					.notNull.withEnumCheck(['db', 'fs', 's3', 'az'])
					.comment('Execution data storage mode the tarballs were written with'),
				column('sourceStorageKey')
					.varchar(255)
					.notNull.comment(
						'Blob key of the source tarball (project minus node_modules, dist, .git)',
					),
				column('distStorageKey')
					.varchar(255)
					.comment('Blob key of the built dist tarball; null once pruned by retention'),
			)
			.withTimestamps.withIndexOn(['appId'])
			.withForeignKey('appId', {
				tableName: APP_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// No FK: it would be circular with app_version.appId. The service only
		// sets it to a version it just inserted and clears it on delete.
		await addColumns(
			APP_TABLE,
			[
				column('activeVersionId')
					.varchar(36)
					.comment('app_version served at /apps/<namespace>/; null falls back to pages'),
			],
			{ recreatesOnSqlite: true },
		);

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);
	}

	async down(ctx: MigrationContext) {
		const { dropColumns, dropTable } = ctx.schemaBuilder;

		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(BINARY_DATA_TABLE)} WHERE ${ctx.escape.columnName(SOURCE_TYPE_COLUMN)} = 'app_version'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await dropColumns(APP_TABLE, ['activeVersionId'], { recreatesOnSqlite: true });
		await dropTable(APP_VERSION_TABLE);
	}

	private async replaceSourceTypeCheck(
		{ schemaBuilder: { addEnumCheck, dropEnumCheck } }: MigrationContext,
		sourceTypes: string[],
	) {
		await dropEnumCheck(BINARY_DATA_TABLE, SOURCE_TYPE_COLUMN, { recreatesOnSqlite: true });
		await addEnumCheck(BINARY_DATA_TABLE, SOURCE_TYPE_COLUMN, sourceTypes, {
			recreatesOnSqlite: true,
		});
	}
}
