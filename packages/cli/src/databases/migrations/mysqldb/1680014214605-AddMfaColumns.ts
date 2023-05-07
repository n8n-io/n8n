import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddMfaColumns1680014214605 implements ReversibleMigration {
	name = 'AddMfaColumns1680014214605';

	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaEnabled\` boolean DEFAULT false`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaSecret\` TEXT DEFAULT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`mfaRecoveryCodes\` TEXT DEFAULT NULL`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaEnabled\``);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaSecret\``);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`mfaRecoveryCodes\``);
	}
}
