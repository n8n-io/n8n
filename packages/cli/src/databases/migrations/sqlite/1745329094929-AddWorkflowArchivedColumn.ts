import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddWorkflowArchivedColumn1745329094929 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT FALSE`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "isArchived"`,
		);
	}
}
