import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * DEMO ONLY. DO NOT MERGE. Earlier demo builds of this test instance created
 * `assistant_usage_event` under other migration names. Drops the table, so the
 * migration that creates it can run on the same database. Does nothing on a new
 * database.
 */
export class ResetAssistantUsageDemo1795853247970 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(`DROP TABLE IF EXISTS ${escape.tableName('assistant_usage_event')}`);
	}
}
