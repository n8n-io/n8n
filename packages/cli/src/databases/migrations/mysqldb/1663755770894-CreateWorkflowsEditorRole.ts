import type { MigrationContext, MigrationInterface } from '@db/types';

export class CreateWorkflowsEditorRole1663755770894 implements MigrationInterface {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			INSERT IGNORE INTO ${tablePrefix}role (name, scope)
			VALUES ("editor", "workflow")
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='workflow';
		`);
	}
}
