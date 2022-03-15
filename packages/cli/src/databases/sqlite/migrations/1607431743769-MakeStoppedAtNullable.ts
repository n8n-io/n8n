import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class MakeStoppedAtNullable1607431743769 implements MigrationInterface {
	name = 'MakeStoppedAtNullable1607431743769';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.get('database.tablePrefix');
		// SQLite does not allow us to simply "alter column"
		// We're hacking the way sqlite identifies tables
		// Allowing a column to become nullable
		// This is a very strict case when this can be done safely
		// As no collateral effects exist.
		await queryRunner.query(`PRAGMA writable_schema = 1; `, undefined);
		await queryRunner.query(
			`UPDATE SQLITE_MASTER SET SQL = 'CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)' WHERE NAME = "${tablePrefix}execution_entity";`,
			undefined,
		);
		await queryRunner.query(`PRAGMA writable_schema = 0;`, undefined);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// This cannot be undone as the table might already have nullable values
	}
}
