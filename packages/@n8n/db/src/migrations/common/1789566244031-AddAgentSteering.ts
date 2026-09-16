import type { MigrationContext, ReversibleMigration } from '../migration-types';

const queueTable = 'agent_message_queue';
const executionTable = 'agent_execution';
const statusesBefore = ['queued', 'processing', 'cancelling'];
const statusesAfter = [...statusesBefore, 'steering', 'delivered', 'undelivered'];

export class AddAgentSteering1789566244031 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, schemaBuilder } = ctx;
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(queueTable)} ADD COLUMN ${escape.columnName('steeringRunId')} varchar(255)`,
		);
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(queueTable)} ADD COLUMN ${escape.columnName('steeringOrder')} integer`,
		);
		await schemaBuilder.dropEnumCheck(queueTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(queueTable, 'status', statusesAfter, {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.createIndex(
			queueTable,
			['threadId', 'steeringOrder'],
			true,
			undefined,
			`${escape.columnName('steeringOrder')} IS NOT NULL`,
		);
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(executionTable)} ADD COLUMN ${escape.columnName('runtimeRunId')} varchar(255)`,
		);
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(executionTable)} ADD COLUMN ${escape.columnName('acceptsSteering')} ${ctx.isSqlite ? 'integer' : 'boolean'} NOT NULL DEFAULT ${ctx.isSqlite ? '0' : 'false'}`,
		);
		if (ctx.isPostgres) {
			await ctx.runQuery(
				`COMMENT ON COLUMN ${escape.tableName(queueTable)}.${escape.columnName('steeringRunId')} IS 'SDK run selected for this correction. Null reserves a new parent turn.'`,
			);
			await ctx.runQuery(
				`COMMENT ON COLUMN ${escape.tableName(queueTable)}.${escape.columnName('steeringOrder')} IS 'Order in which Send now actions were accepted for this thread.'`,
			);
			await ctx.runQuery(
				`COMMENT ON COLUMN ${escape.tableName(executionTable)}.${escape.columnName('runtimeRunId')} IS 'SDK run that can receive steering input.'`,
			);
			await ctx.runQuery(
				`COMMENT ON COLUMN ${escape.tableName(executionTable)}.${escape.columnName('acceptsSteering')} IS 'Whether this execution can receive steering input.'`,
			);
		}
	}

	async down(ctx: MigrationContext) {
		const { escape, schemaBuilder } = ctx;
		const rows = await ctx.runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS ${escape.columnName('count')} FROM ${escape.tableName(queueTable)} WHERE ${escape.columnName('status')} IN ('steering', 'delivered', 'undelivered') OR ${escape.columnName('steeringOrder')} IS NOT NULL OR ${escape.columnName('steeringRunId')} IS NOT NULL`,
		);
		if (Number(rows[0]?.count ?? 0) > 0) {
			throw new Error('Cannot remove agent steering while steering messages exist');
		}
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName('runtimeRunId')}`,
		);
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName('acceptsSteering')}`,
		);
		await schemaBuilder.dropIndex(queueTable, ['threadId', 'steeringOrder']);
		await schemaBuilder.dropEnumCheck(queueTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(queueTable, 'status', statusesBefore, {
			recreatesOnSqlite: true,
		});
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(queueTable)} DROP COLUMN ${escape.columnName('steeringRunId')}`,
		);
		await ctx.runQuery(
			`ALTER TABLE ${escape.tableName(queueTable)} DROP COLUMN ${escape.columnName('steeringOrder')}`,
		);
	}
}
