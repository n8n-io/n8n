import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateFavoritesTable1776150756000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('user_favorites')
			.withColumns(
				column('id').int.primary.autoGenerate2.notNull,
				column('userId').uuid.notNull,
				column('resourceId').varchar(255).notNull,
				column('resourceType').varchar(64).notNull,
			)
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('userId')
			.withIndexOn(['resourceType', 'resourceId'])
			.withUniqueConstraintOn(['userId', 'resourceId', 'resourceType']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('user_favorites');
	}
}
