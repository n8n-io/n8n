import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DropAgentExecutionFallbackColumns1784000000039 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns, dropNotNull } }: MigrationContext) {
		await dropColumns('agent_execution', ['assistantResponse', 'toolCalls'], {
			recreatesOnSqlite: true,
		});
		await dropNotNull('agent_execution', 'userMessage', { recreatesOnSqlite: true });
	}

	async down(ctx: MigrationContext) {
		const {
			escape,
			schemaBuilder: { addColumns, addNotNull, column },
		} = ctx;

		await addColumns(
			'agent_execution',
			[column('assistantResponse').text.notNull.default("''"), column('toolCalls').json],
			{ recreatesOnSqlite: true },
		);

		await ctx.runQuery(
			`UPDATE ${escape.tableName('agent_execution')} SET ${escape.columnName('userMessage')} = '' WHERE ${escape.columnName('userMessage')} IS NULL`,
		);
		await addNotNull('agent_execution', 'userMessage', { recreatesOnSqlite: true });
	}
}
