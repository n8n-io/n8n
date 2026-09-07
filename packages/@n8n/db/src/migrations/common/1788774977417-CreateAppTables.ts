import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';
const PAGE_TABLE = 'page';

/**
 * Top-level App entity (project-scoped) and its Page tree. A Page's block
 * content is stored as-is for now (opaque JSON); the block schema and
 * renderer land separately.
 */
export class CreateAppTables1788774977417 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column } }: MigrationContext) {
		await createTable(APP_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('namespace')
					.varchar(128)
					.notNull.comment('URL path segment under /apps/; unique per project'),
				column('theme').json.comment('Shared colors/spacing for the App, app-defined shape'),
				column('projectId').varchar(36).notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createIndex(APP_TABLE, ['namespace', 'projectId'], true);

		await createTable(PAGE_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('appId').varchar(36).notNull,
				column('parentPageId').varchar(36).comment('Self-reference; null for a top-level page'),
				column('route')
					.varchar(255)
					.notNull.comment('Path segment under its parent, may contain :params'),
				column('content').json.comment(
					'Block tree (Editor.js-shaped); empty until the renderer lands',
				),
			)
			.withTimestamps.withForeignKey('appId', {
				tableName: APP_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('parentPageId', {
				tableName: PAGE_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createIndex(PAGE_TABLE, ['appId']);
		await createIndex(PAGE_TABLE, ['parentPageId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(PAGE_TABLE);
		await dropTable(APP_TABLE);
	}
}
