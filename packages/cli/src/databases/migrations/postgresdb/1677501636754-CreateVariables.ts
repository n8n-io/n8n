import type { MigrationContext, MigrationInterface } from '@db/types';

export class CreateVariables1677501636754 implements MigrationInterface {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			CREATE TABLE ${tablePrefix}variables (
				id serial4 NOT NULL PRIMARY KEY,
				"key" varchar(50) NOT NULL,
				"type" varchar(50) NOT NULL DEFAULT 'string',
				value varchar(255) NULL,
				UNIQUE ("key")
			);
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}variables;`);
	}
}
