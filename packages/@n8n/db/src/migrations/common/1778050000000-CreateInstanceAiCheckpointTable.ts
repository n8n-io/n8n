import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_checkpoints';

export class CreateInstanceAiCheckpointTable1778050000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('key').varchar(255).primary.notNull,
				column('runId').varchar(255),
				column('threadId').uuid.notNull,
				column('resourceId').varchar(255),
				column('state').text.notNull,
			)
			.withIndexOn('runId')
			.withIndexOn('threadId')
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('resourceId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
