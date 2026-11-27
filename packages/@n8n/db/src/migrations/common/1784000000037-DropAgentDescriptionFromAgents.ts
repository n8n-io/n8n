import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DropAgentDescriptionFromAgents1784000000037 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, schemaBuilder: { dropColumns } }: MigrationContext) {
		// An earlier interrupted SQLite run can leave `description` dropped without a
		// row in `migrations`. Skip the drop so the migration record can be written.
		if (!(await queryRunner.hasColumn(`${tablePrefix}agents`, 'description'))) return;

		await dropColumns('agents', ['description'], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agents', [column('description').varchar(512)], {
			recreatesOnSqlite: true,
		});
	}
}
