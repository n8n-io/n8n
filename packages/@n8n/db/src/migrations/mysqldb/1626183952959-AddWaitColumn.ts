import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWaitColumnId1626183952959 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` ADD `waitTill` DATETIME NULL',
		);
		await queryRunner.query(
			'CREATE INDEX `IDX_' +
				tablePrefix +
				'ca4a71b47f28ac6ea88293a8e2` ON `' +
				tablePrefix +
				'execution_entity` (`waitTill`)',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'DROP INDEX `IDX_' +
				tablePrefix +
				'ca4a71b47f28ac6ea88293a8e2` ON `' +
				tablePrefix +
				'execution_entity`',
		);
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` DROP COLUMN `waitTill`',
		);
	}
}
