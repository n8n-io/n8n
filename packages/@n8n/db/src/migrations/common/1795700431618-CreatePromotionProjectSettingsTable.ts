import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'promotion_project_settings';

export class CreatePromotionProjectSettingsTable1795700431618 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('allowEnvironments')
					.bool.notNull.default(false)
					.comment(
						'Set by an instance admin. When true, this project can have its own environments',
					),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${tableName}_projectId`,
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
