import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddTriggerCountColumn1669823906993 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "triggerCount" integer NOT NULL DEFAULT 0`,
		);
		// Table will be populated by n8n startup - see ActiveWorkflowRunner.ts
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "triggerCount"`,
		);
	}
}
