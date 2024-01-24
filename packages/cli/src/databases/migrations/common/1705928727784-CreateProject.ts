import type { MigrationContext, ReversibleMigration } from '@db/types';

const tableName = 'project';
const relationTableName = 'project_relation';

export class CreateProject1705928727784 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName).withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(255),
			column('type').varchar(36),
		).withTimestamps;

		await createTable(relationTableName)
			.withColumns(
				column('projectId').varchar(36).primary.notNull,
				column('userId').uuid.primary.notNull,
				column('role').varchar().notNull,
			)
			.withIndexOn('projectId')
			.withIndexOn('userId')
			.withForeignKey('projectId', {
				tableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(relationTableName);
		await dropTable(tableName);
	}
}
