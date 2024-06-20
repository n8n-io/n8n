import type { MigrationContext, ReversibleMigration } from '@db/types';

export class ChangeCredentialDataSize1620729500000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' +
				tablePrefix +
				'credentials_entity` MODIFY COLUMN `type` varchar(128) NOT NULL',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' +
				tablePrefix +
				'credentials_entity` MODIFY COLUMN `type` varchar(32) NOT NULL',
		);
	}
}
