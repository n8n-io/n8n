import type { MigrationContext, IrreversibleMigration } from '@/databases/types';

export class ClearEvaluation1745322634000 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropColumns, dropTable } }: MigrationContext) {
		console.log('Clearing evaluations...');

		// Remove test_definition & test_metric tables
		console.log('test_run');
		await dropColumns('test_run', ['testDefinitionId']);
		console.log('test_metric');
		await dropTable('test_metric');
		console.log('test_definition');
		await dropTable('test_definition');

		// Remove pastExecutionId, evaluationExecutionId
		await dropColumns('test_case_execution', ['pastExecutionId', 'evaluationExecutionId']);
	}
}
