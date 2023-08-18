import type { MigrationContext, ReversibleMigration } from '@db/types';
import { TableColumn } from 'typeorm';

export class RemoveResetPasswordColumns1690000000030 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropColumns(`${tablePrefix}user`, [
			'resetPasswordToken',
			'resetPasswordTokenExpiration',
		]);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.addColumns(`${tablePrefix}user`, [
			new TableColumn({
				name: 'resetPasswordToken',
				type: 'varchar',
				isNullable: true,
			}),
			new TableColumn({
				name: 'resetPasswordTokenExpiration',
				type: 'int',
				isNullable: true,
			}),
		]);
	}
}
