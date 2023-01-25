import type { MigrationContext, MigrationInterface } from '@db/types';

export class MakeStoppedAtNullable1607431743767 implements MigrationInterface {
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
