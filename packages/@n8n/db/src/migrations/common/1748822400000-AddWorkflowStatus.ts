import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowStatus1748822400000 implements ReversibleMigration {
	name = 'AddWorkflowStatus1748822400000';

	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if the column already exists
		const table = await queryRunner.getTable(`${tablePrefix}workflow_entity`);
		const columnExists = table?.findColumnByName('status');

		if (!columnExists) {
			await queryRunner.query(
				`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN status VARCHAR(255) DEFAULT 'created' NOT NULL`,
			);
			await queryRunner.query(
				`CREATE INDEX IDX_${tablePrefix}workflow_status ON ${tablePrefix}workflow_entity(status)`,
			);
		}
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if the column exists before trying to drop it
		const table = await queryRunner.getTable(`${tablePrefix}workflow_entity`);
		const columnExists = table?.findColumnByName('status');

		if (columnExists) {
			await queryRunner.query(`DROP INDEX IDX_${tablePrefix}workflow_status`);
			await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN status`);
		}
	}
}
