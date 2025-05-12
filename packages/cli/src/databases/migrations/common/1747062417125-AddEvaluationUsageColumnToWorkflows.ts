import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddEvaluationUsageColumnToWorkflows1747062417125 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN "hasEvaluation" integer NOT NULL DEFAULT 0`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN "hasEvaluation"`,
		);
	}
}
