import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddExecutionDeduplicationKey1778000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('execution_entity', [column('deduplicationKey').varchar(255)]);
		await createIndex('execution_entity', ['deduplicationKey'], true);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('execution_entity', ['deduplicationKey']);
		await dropColumns('execution_entity', ['deduplicationKey']);
	}
}
