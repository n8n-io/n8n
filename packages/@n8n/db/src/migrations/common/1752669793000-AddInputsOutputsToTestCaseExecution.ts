import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddInputsOutputsToTestCaseExecution1752669793000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('test_case_execution', [column('inputs').json, column('outputs').json], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('test_case_execution', ['inputs', 'outputs'], {
			recreatesOnSqlite: true,
		});
	}
}
