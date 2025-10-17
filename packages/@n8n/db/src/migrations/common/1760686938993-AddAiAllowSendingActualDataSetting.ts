import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAiAllowSendingActualDataSetting1760686938993 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Check if the setting already exists
		const existingSetting = await queryRunner.query(
			`SELECT * FROM "${tablePrefix}settings" WHERE key = ?`,
			['ai.allowSendingActualData'],
		);

		// Only insert if it doesn't exist
		if (!existingSetting || existingSetting.length === 0) {
			await queryRunner.query(
				`INSERT INTO "${tablePrefix}settings" (key, value, loadOnStartup) VALUES (?, ?, ?)`,
				['ai.allowSendingActualData', 'false', true],
			);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DELETE FROM "${tablePrefix}settings" WHERE key = ?`, [
			'ai.allowSendingActualData',
		]);
	}
}
