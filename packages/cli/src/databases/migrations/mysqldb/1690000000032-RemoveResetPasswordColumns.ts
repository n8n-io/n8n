import type { MigrationContext, ReversibleMigration } from '@db/types';
import { TableColumn } from 'typeorm';

export class RemoveResetPasswordColumns1690000000032 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropColumn(`${tablePrefix}user`, 'resetPasswordToken');
		await queryRunner.dropColumn(`${tablePrefix}user`, 'resetPasswordTokenExpiration');
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.addColumn(
			`${tablePrefix}user`,
			new TableColumn({
				name: 'resetPasswordToken',
				type: 'varchar',
				isNullable: true,
			}),
		);

		await queryRunner.addColumn(
			`${tablePrefix}user`,
			new TableColumn({
				name: 'resetPasswordTokenExpiration',
				type: 'int',
				isNullable: true,
			}),
		);
	}
}
