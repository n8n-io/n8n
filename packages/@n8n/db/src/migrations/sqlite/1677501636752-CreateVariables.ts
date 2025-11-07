import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateVariables1677501636752 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			CREATE TABLE ${tablePrefix}variables (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				"key" TEXT NOT NULL,
				"type" TEXT NOT NULL DEFAULT ('string'),
				value TEXT,
				UNIQUE("key")
			);
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}variables;`);
	}
}
