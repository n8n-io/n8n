import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWorkflowMetadata1695128658538 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\`	ADD COLUMN \`meta\` json`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}workflow_entity\`	DROP COLUMN \`meta\``);
	}
}
