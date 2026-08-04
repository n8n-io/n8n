import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const statusesBefore = ['success', 'error'];
const statusesAfter = ['running', 'success', 'error', 'cancelled', 'interrupted'];

export class AddAgentExecutionRuntimeState1785828155091 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(executionTable, 'status', statusesAfter, {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.createIndex(executionTable, ['status']);
	}

	async down(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;

		await schemaBuilder.dropIndex(executionTable, ['status']);
		await ctx.runQuery(
			`UPDATE ${ctx.escape.tableName(executionTable)} ` +
				`SET ${ctx.escape.columnName('status')} = 'error' ` +
				`WHERE ${ctx.escape.columnName('status')} IN ('running', 'cancelled', 'interrupted')`,
		);
		await schemaBuilder.dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(executionTable, 'status', statusesBefore, {
			recreatesOnSqlite: true,
		});
	}
}
