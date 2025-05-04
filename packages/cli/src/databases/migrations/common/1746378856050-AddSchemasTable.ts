import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddSchemasTable1746378856050 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('schemas').withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
			column('definition').json.notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('schemas');
	}
}
