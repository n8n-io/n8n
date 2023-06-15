import type { ReversibleMigration, MigrationContext } from '@db/types';

export class AddV1BannerSetting1681134145998 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings (key, value, loadOnStartup)
			VALUES ('ui.banners.v1.dismissed', 'false', true);`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DELETE FROM "${tablePrefix}settings" WHERE key = 'ui.banners.v1.dismissed';`,
		);
	}
}
