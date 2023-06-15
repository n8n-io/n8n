import type { IrreversibleMigration, MigrationContext } from '@db/types';

export class AddV1BannerSetting1681134145998 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings (key, value, loadOnStartup)
			VALUES ('ui.banners.v1.dismissed', 'false', true);`,
		);
	}
}
