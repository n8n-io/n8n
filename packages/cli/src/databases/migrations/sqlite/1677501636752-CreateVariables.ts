import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart, getTablePrefix } from '@db/utils/migrationHelpers';
import config from '@/config';

export class CreateVariables1677501636752 implements MigrationInterface {
	name = 'CreateVariables1677501636752';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			CREATE TABLE ${tablePrefix}variables (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				"key" TEXT NOT NULL,
				"type" TEXT NOT NULL DEFAULT ('string'),
				value TEXT,
				UNIQUE("key")
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
