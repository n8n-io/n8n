import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class MakeStoppedAtNullable1607431743769 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// SQLite does not allow us to simply "alter column"
		// We're hacking the way sqlite identifies tables
		// Allowing a column to become nullable
		// This is a very strict case when this can be done safely
		// As no collateral effects exist.
		await queryRunner.query('PRAGMA writable_schema = 1;');
		await queryRunner.query(
			`UPDATE SQLITE_MASTER SET SQL = 'CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)' WHERE NAME = "${tablePrefix}execution_entity";`,
		);
		await queryRunner.query('PRAGMA writable_schema = 0;');
	}
}
