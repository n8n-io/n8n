import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddUserSettings1652367743993 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'user` ADD COLUMN `settings` json NULL DEFAULT NULL',
		);
		await queryRunner.query(
			'ALTER TABLE `' +
				tablePrefix +
				'user` CHANGE COLUMN `personalizationAnswers` `personalizationAnswers` json NULL DEFAULT NULL',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'user` DROP COLUMN `settings`');
	}
}
