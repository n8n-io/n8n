import type { MigrationContext, MigrationInterface } from '@db/types';

export class AddStatusToExecutions1674138566000 implements MigrationInterface {
	public async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ADD COLUMN status varchar`);
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN status`);
	}
}
