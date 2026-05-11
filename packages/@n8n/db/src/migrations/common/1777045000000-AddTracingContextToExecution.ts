import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTracingContextToExecution1777045000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_entity', [column('tracingContext').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_entity', ['tracingContext']);
	}
}
