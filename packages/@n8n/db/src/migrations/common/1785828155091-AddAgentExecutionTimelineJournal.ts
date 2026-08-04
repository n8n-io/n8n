import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const journalTable = 'agent_execution_timeline_journal';
const statusesBefore = ['success', 'error'];
const statusesAfter = ['running', 'success', 'error', 'cancelled', 'interrupted'];

export class AddAgentExecutionTimelineJournal1785828155091 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;

		await schemaBuilder.dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(executionTable, 'status', statusesAfter, {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.addColumns(
			executionTable,
			[
				schemaBuilder
					.column('runId')
					.varchar(64)
					.comment('Opaque run identifier assigned by the agent runtime'),
			],
			{ recreatesOnSqlite: true },
		);
		await schemaBuilder.createIndex(executionTable, ['status']);

		await schemaBuilder
			.createTable(journalTable)
			.withColumns(
				schemaBuilder.column('executionId').varchar(36).primary,
				schemaBuilder
					.column('seq')
					.int.primary.comment('Monotonic sequence within one agent execution'),
				schemaBuilder.column('event').text.notNull.comment('Serialized TimelineEvent snapshot'),
			)
			.withForeignKey('executionId', {
				tableName: executionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;

		await schemaBuilder.dropTable(journalTable);
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
		await schemaBuilder.dropColumns(executionTable, ['runId'], { recreatesOnSqlite: true });
	}
}
