import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const statusesBefore = ['running', 'success', 'error', 'cancelled', 'interrupted'];
const statusesAfter = [...statusesBefore, 'awaiting'];

// The status is unreleased. A dev database that applied an earlier revision of
// this migration ('waiting') must be reset, not migrated forward.

export class AddWaitingStatusToAgentExecution1792496430068 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(executionTable, 'status', statusesAfter, {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder, escape, runQuery }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName(executionTable)} ` +
				`SET ${escape.columnName('status')} = 'error' ` +
				`WHERE ${escape.columnName('status')} = 'awaiting'`,
		);
		await schemaBuilder.dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(executionTable, 'status', statusesBefore, {
			recreatesOnSqlite: true,
		});
	}
}
