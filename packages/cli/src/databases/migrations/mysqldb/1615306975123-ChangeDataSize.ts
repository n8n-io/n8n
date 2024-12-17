import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class ChangeDataSize1615306975123 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` MEDIUMTEXT NOT NULL',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` TEXT NOT NULL',
		);
	}
}
