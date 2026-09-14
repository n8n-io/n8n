import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';
const ACTIVE_VERSION_FK = 'app_activeVersionId_foreign';

/**
 * A published version of an App: a frozen JSON snapshot of its page tree and
 * theme. `app.activeVersionId` points at the one currently served.
 */
export class CreateAppVersionTable1788870173613 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, addForeignKey, column },
	}: MigrationContext) {
		await createTable(APP_VERSION_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('appId').varchar(36).notNull,
				column('snapshot').json.notNull.comment('Frozen page tree + theme, see AppVersionSnapshot'),
				column('createdById').uuid.comment(
					'User who published this version; null once they are deleted',
				),
			)
			.withTimestamps.withIndexOn(['appId'])
			.withForeignKey('appId', {
				tableName: APP_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		await addColumns(
			APP_TABLE,
			[
				column('activeVersionId')
					.varchar(36)
					.comment('app_version served at /apps/<namespace>; null means unpublished'),
			],
			{ recreatesOnSqlite: true },
		);
		// Deleting the active version returns the App to "unpublished" instead of
		// leaving a dangling pointer.
		await addForeignKey(
			APP_TABLE,
			'activeVersionId',
			[APP_VERSION_TABLE, 'id'],
			ACTIVE_VERSION_FK,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey, dropTable } }: MigrationContext) {
		await dropForeignKey(
			APP_TABLE,
			'activeVersionId',
			[APP_VERSION_TABLE, 'id'],
			ACTIVE_VERSION_FK,
		);
		await dropColumns(APP_TABLE, ['activeVersionId'], { recreatesOnSqlite: true });
		await dropTable(APP_VERSION_TABLE);
	}
}
