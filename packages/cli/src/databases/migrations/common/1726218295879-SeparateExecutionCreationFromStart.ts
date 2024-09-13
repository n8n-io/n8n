import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class SeparateExecutionCreationFromStart1726218295879 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, dropNotNull } }: MigrationContext) {
		await addColumns('execution_entity', [column('createdAt').timestamp().default('NOW()')]);
		await dropNotNull('execution_entity', 'startedAt');
	}

	async down({ schemaBuilder: { dropColumns, addNotNull } }: MigrationContext) {
		await dropColumns('execution_entity', ['createdAt']);
		await addNotNull('execution_entity', 'startedAt');
	}
}
