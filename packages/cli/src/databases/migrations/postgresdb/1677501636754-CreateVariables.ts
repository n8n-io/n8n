import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart, getTablePrefix } from '@db/utils/migrationHelpers';
import config from '@/config';

export class CreateVariables1677501636754 implements MigrationInterface {
	name = 'CreateVariables1677501636754';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			CREATE TABLE public.variables (
				id serial4 NOT NULL PRIMARY KEY,
				"key" text NOT NULL,
				"type" text NOT NULL DEFAULT 'string',
				value text NULL
			);
		`);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`DROP TABLE ${tablePrefix}variables;`);

		logMigrationEnd(this.name);
	}
}
