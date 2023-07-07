import type { ReversibleMigration, MigrationContext } from '@db/types';

export class SetMigrationFlagSetting1690000000032 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const workflowIds = (await queryRunner.query(`
			SELECT id FROM "${tablePrefix}workflow_entity"
		`)) as Array<{ id: number }>;

		await queryRunner.query(`
			INSERT INTO "${tablePrefix}settings" (key, value, loadOnStartup)
				VALUES ('instance.isPreV1Instance', '${workflowIds.length > 0 ? 'true' : 'false'}', true)
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DELETE FROM "${tablePrefix}settings" WHERE key = 'instance.isPreV1Instance'`,
		);
	}
}
