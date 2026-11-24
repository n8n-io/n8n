import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddStoredAtToExecutionEntity1768557000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const storedAt = escape.columnName('storedAt');

		await runQuery(
			`ALTER TABLE ${executionEntity} ADD COLUMN ${storedAt} VARCHAR(2) NOT NULL DEFAULT 'db' CHECK(${storedAt} IN ('db', 'fs', 's3'))`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const storedAt = escape.columnName('storedAt');

		await runQuery(`ALTER TABLE ${executionEntity} DROP COLUMN ${storedAt}`);
	}
}
