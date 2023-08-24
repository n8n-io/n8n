import type { MigrationContext, ReversibleMigration } from '@/databases/types';
import { TableColumn } from 'typeorm';

export class AddMfaColumns1690000000030 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.addColumns(`${tablePrefix}user`, [
			new TableColumn({
				name: 'mfaEnabled',
				type: 'boolean',
				isNullable: false,
				default: false,
			}),
			new TableColumn({
				name: 'mfaSecret',
				type: 'text',
				isNullable: true,
				default: null,
			}),
			new TableColumn({
				name: 'mfaRecoveryCodes',
				type: 'text',
				isNullable: true,
				default: null,
			}),
		]);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropColumns(`${tablePrefix}user`, [
			'mfaEnabled',
			'mfaSecret',
			'mfaRecoveryCodes',
		]);
	}
}
