import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSessionColumnsToExecutionThreads1778000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_threads', [
			column('sessionNumber').int.default(0).notNull,
			column('totalPromptTokens').int.default(0).notNull,
			column('totalCompletionTokens').int.default(0).notNull,
			column('totalCost').double.default(0).notNull,
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_threads', [
			'sessionNumber',
			'totalPromptTokens',
			'totalCompletionTokens',
			'totalCost',
		]);
	}
}
