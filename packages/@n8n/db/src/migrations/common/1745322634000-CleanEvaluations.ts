import type { MigrationContext, IrreversibleMigration } from '@/databases/types';

export class ClearEvaluation1745322634000 implements IrreversibleMigration {
	async up({
		isMysql,
		queryRunner,
		tablePrefix,
		schemaBuilder: { dropColumns, dropTable },
	}: MigrationContext) {
		// Update test_run
		if (isMysql) {
			await queryRunner.query(
				'ALTER TABLE `' +
					tablePrefix +
					'test_run` DROP FOREIGN KEY `FK_' +
					tablePrefix +
					'3a81713a76f2295b12b46cdfcab`',
			);
			await queryRunner.query(
				'DROP INDEX `IDX_' +
					tablePrefix +
					'3a81713a76f2295b12b46cdfca` ON `' +
					tablePrefix +
					'test_run`',
			);
		}
		await dropColumns('test_run', ['testDefinitionId', 'totalCases', 'passedCases', 'failedCases']);

		// Drop test_metric, test_definition
		await dropTable('test_metric');
		await dropTable('test_definition');

		// Update test_case_execution
		if (isMysql) {
			await queryRunner.query(
				'ALTER TABLE `' +
					tablePrefix +
					'test_case_execution` DROP FOREIGN KEY `FK_' +
					tablePrefix +
					'8e4b4774db42f1e6dda3452b2af`',
			);
			await queryRunner.query(
				'ALTER TABLE `' +
					tablePrefix +
					'test_case_execution` DROP FOREIGN KEY `FK_' +
					tablePrefix +
					'258d954733841d51edd826a562b`',
			);
			await queryRunner.query(
				'ALTER TABLE `' +
					tablePrefix +
					'test_case_execution` DROP FOREIGN KEY `FK_' +
					tablePrefix +
					'dfbe194e3ebdfe49a87bc4692ca`',
			);
		}
		await dropColumns('test_case_execution', ['pastExecutionId', 'evaluationExecutionId']);
	}
}
