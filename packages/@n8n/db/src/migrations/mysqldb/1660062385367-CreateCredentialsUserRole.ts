import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateCredentialsUserRole1660062385367 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			INSERT IGNORE INTO ${tablePrefix}role (name, scope)
			VALUES ("user", "credential");
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='credential';
		`);
	}
}
