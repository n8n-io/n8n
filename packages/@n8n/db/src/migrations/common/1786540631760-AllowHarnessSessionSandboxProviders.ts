import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_harness_sessions';
const column = 'adapter';
const valuesBefore = ['claude-code', 'codex'];
const valuesAfter = [
	...valuesBefore,
	'claude-code:daytona',
	'claude-code:n8n-sandbox',
	'codex:daytona',
	'codex:n8n-sandbox',
];

export class AllowHarnessSessionSandboxProviders1786540631760 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, valuesAfter, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName(column)} NOT IN ('claude-code', 'codex')`,
		);
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, valuesBefore, { recreatesOnSqlite: true });
	}
}
