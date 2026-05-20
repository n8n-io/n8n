import type { MigrationContext, ReversibleMigration } from '../migration-types';

const DASHBOARD_TABLE_NAME = 'dashboard';
const DASHBOARD_SHARE_TABLE_NAME = 'dashboard_share';

export class CreateDashboardTables1785000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(DASHBOARD_TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').text,
				column('spec').json.notNull,
				column('tags').json,
				column('archived').bool.default(false).notNull,
				column('projectId').varchar(36).notNull,
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('projectId')
			.withUniqueConstraintOn(['projectId', 'name']).withTimestamps;

		await createTable(DASHBOARD_SHARE_TABLE_NAME)
			.withColumns(
				column('dashboardId').varchar(36).notNull,
				column('userId').uuid.notNull,
				column('role').varchar(32).notNull,
			)
			.withForeignKey('dashboardId', {
				tableName: DASHBOARD_TABLE_NAME,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('userId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(DASHBOARD_SHARE_TABLE_NAME);
		await dropTable(DASHBOARD_TABLE_NAME);
	}
}
