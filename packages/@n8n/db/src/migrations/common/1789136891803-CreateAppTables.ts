import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';
const THREAD_TABLE = 'instance_ai_threads';
const BINARY_DATA_TABLE = 'binary_data';
const SOURCE_TYPE_COLUMN = 'sourceType';
const ACTIVE_VERSION_FK = 'app_activeVersionId_foreign';
const THREAD_APP_FK = 'instance_ai_threads_appId_foreign';
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];
const sourceTypesAfter = [...sourceTypesBefore, 'app_version'];

/**
 * Project-scoped App entity and its built versions. A version is a source
 * tarball plus, while retained, a dist tarball; bytes live in blob storage and
 * the row records where. An Instance AI thread can be bound to the app it
 * builds so the app page resumes the newest one.
 */
export class CreateAppTables1789136891803 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, createIndex, addColumns, addForeignKey, column } = ctx.schemaBuilder;

		await createTable(APP_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				// Served at `/apps/<namespace>`, a URL that carries no project, so the
				// namespace must resolve to one App instance-wide.
				column('namespace')
					.varchar(128)
					.notNull.comment('URL path segment under /apps/'),
				column('theme').json.comment('Shared colors/spacing for the App, app-defined shape'),
				column('projectId').varchar(36).notNull,
				column('bindings')
					.json.notNull.default("'[]'")
					.comment('Resources the served app may call through its runtime API'),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createIndex(APP_TABLE, ['namespace'], true);

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
				column('sourceSizeBytes')
					.int.notNull.default(0)
					.comment('Size of the source tarball, in bytes'),
				column('distSizeBytes').int.comment(
					'Size of the dist tarball, in bytes; null once pruned by retention',
				),
				column('label')
					.varchar(128)
					.comment('Short summary of what changed, set by the AI Assistant after a turn'),
			)
			.withTimestamps.withIndexOn(['appId'])
			.withForeignKey('appId', {
				tableName: APP_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await addColumns(
			APP_TABLE,
			[
				column('activeVersionId')
					.varchar(36)
					.comment('app_version served at /apps/<namespace>/; null means unpublished'),
			],
			{ recreatesOnSqlite: true },
		);
		// Deleting the active version unpublishes the app instead of leaving a
		// dangling pointer.
		await addForeignKey(
			APP_TABLE,
			'activeVersionId',
			[APP_VERSION_TABLE, 'id'],
			ACTIVE_VERSION_FK,
			'SET NULL',
		);

		await this.replaceSourceTypeCheck(ctx, sourceTypesAfter);

		// Deleting an app keeps the conversation and only unlinks it.
		await addColumns(
			THREAD_TABLE,
			[column('appId').varchar(36).comment('App this thread builds; null for other threads')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(THREAD_TABLE, 'appId', [APP_TABLE, 'id'], THREAD_APP_FK, 'SET NULL');
		await createIndex(THREAD_TABLE, ['appId', 'updatedAt']);
	}

	async down(ctx: MigrationContext) {
		const { dropColumns, dropForeignKey, dropIndex, dropTable } = ctx.schemaBuilder;

		await dropIndex(THREAD_TABLE, ['appId', 'updatedAt']);
		await dropForeignKey(THREAD_TABLE, 'appId', [APP_TABLE, 'id'], THREAD_APP_FK);
		await dropColumns(THREAD_TABLE, ['appId'], { recreatesOnSqlite: true });

		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName(BINARY_DATA_TABLE)} WHERE ${ctx.escape.columnName(SOURCE_TYPE_COLUMN)} = 'app_version'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await dropForeignKey(
			APP_TABLE,
			'activeVersionId',
			[APP_VERSION_TABLE, 'id'],
			ACTIVE_VERSION_FK,
		);
		await dropColumns(APP_TABLE, ['activeVersionId'], { recreatesOnSqlite: true });
		await dropTable(APP_VERSION_TABLE);
		await dropTable(APP_TABLE);
	}

	/**
	 * Two table rebuilds on SQLite: the schema builder has no single-step
	 * replacement for an enum check, and the earlier `binary_data` source type
	 * migrations use the same pair.
	 */
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
