import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionMessages1790590278292 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { createTable, createIndex, column },
			escape,
			runQuery,
		} = ctx;
		await this.addMessageColumns(ctx);
		await runQuery(
			`UPDATE ${escape.tableName('agents_messages')} SET ${escape.columnName('modelContextAt')} = ${escape.columnName('createdAt')}`,
		);
		await createIndex('agents_messages', ['threadId', 'modelContextAt', 'id']);
		await createTable('agent_execution_messages')
			.withColumns(
				column('executionId')
					.varchar(36)
					.primary.comment('Execution that consumed or wrote the message'),
				column('messageId').varchar(36).primary.comment('Canonical conversation message ID'),
				column('direction')
					.varchar(6)
					.notNull.withEnumCheck(['input', 'output'])
					.comment('Input consumed by the execution or output written by it'),
				column('position').int.notNull.comment(
					'Input message IDs in consumption order. Steering can add messages to the same execution.',
				),
			)
			.withCreatedAt.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('messageId', {
				tableName: 'agents_messages',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['executionId', 'direction', 'position'], true)
			.withIndexOn('messageId');
	}

	private async addMessageColumns({
		schemaBuilder: { addColumns, column },
		isSqlite,
		escape,
		runQuery,
	}: MigrationContext) {
		if (isSqlite) {
			// Recreating this table would clear existing memory-source foreign keys.
			for (const [name, type] of [
				['author', 'TEXT'],
				['origin', 'TEXT'],
				['modelContent', 'TEXT'],
				['modelContextAt', 'DATETIME'],
			]) {
				await runQuery(
					`ALTER TABLE ${escape.tableName('agents_messages')} ADD COLUMN ${escape.columnName(name)} ${type}`,
				);
			}
			return;
		}
		await addColumns(
			'agents_messages',
			[
				column('author').json.comment('Original message author supplied by the chat platform'),
				column('origin').json.comment(
					'Source identifiers and transcript visibility. NULL for legacy or SDK-only messages',
				),
				column('modelContent').json.comment(
					'Enriched model input when it differs from the original content',
				),
				column('modelContextAt')
					.timestampTimezone()
					.comment('Runtime ordering timestamp. NULL inputs are excluded from model context'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({
		schemaBuilder: { dropTable, dropIndex, dropColumns },
		isSqlite,
		escape,
		runQuery,
	}: MigrationContext) {
		await dropTable('agent_execution_messages');
		await dropIndex('agents_messages', ['threadId', 'modelContextAt', 'id']);
		const columns = ['author', 'origin', 'modelContent', 'modelContextAt'];
		if (isSqlite) {
			for (const name of columns) {
				await runQuery(
					`ALTER TABLE ${escape.tableName('agents_messages')} DROP COLUMN ${escape.columnName(name)}`,
				);
			}
			return;
		}
		await dropColumns('agents_messages', columns, { recreatesOnSqlite: true });
	}
}
