import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddStatsColumnsToTestRun1733494526213 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('test_run', [column('total').int, column('passed').int, column('failed').int]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('test_run', ['total', 'passed', 'failed']);
	}
}
