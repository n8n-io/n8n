import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddInputsOutputsToTestCaseExecution1752669793000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}test_case_execution\` ADD COLUMN "inputs" text`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}test_case_execution\` ADD COLUMN "outputs" text`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}test_case_execution\` DROP COLUMN "inputs"`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}test_case_execution\` DROP COLUMN "outputs"`,
		);
	}
}
