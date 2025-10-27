import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class MakeStoppedAtNullable1607431743767 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime NOT NULL',
		);
	}
}
