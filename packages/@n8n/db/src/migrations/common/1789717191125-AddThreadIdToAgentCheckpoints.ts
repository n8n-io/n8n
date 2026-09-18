import type { MigrationContext, ReversibleMigration } from '../migration-types';

const indexColumns = ['agentId', 'threadId', 'expired', 'updatedAt'];

export class AddThreadIdToAgentCheckpoints1789717191125 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { addColumns, column, createIndex } = context.schemaBuilder;
		await addColumns(
			'agent_checkpoints',
			[
				column('threadId').text.comment(
					'SDK thread key from checkpoint state. Execution history is optional.',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await this.backfillThreadIds(context);
		await createIndex('agent_checkpoints', indexColumns);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('agent_checkpoints', indexColumns);
		await dropColumns('agent_checkpoints', ['threadId'], { recreatesOnSqlite: true });
	}

	private async backfillThreadIds({
		escape,
		runInBatches,
		runQuery,
		parseJson,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName('agent_checkpoints');
		const runIdColumn = escape.columnName('runId');
		const stateColumn = escape.columnName('state');
		const threadIdColumn = escape.columnName('threadId');

		// Updating threadId must not change the row set used by offset pagination.
		await runInBatches<{ runId: string; state: string }>(
			`SELECT ${runIdColumn}, ${stateColumn} FROM ${table} WHERE ${stateColumn} IS NOT NULL ORDER BY ${runIdColumn}`,
			async (rows) => {
				for (const row of rows) {
					let state: { persistence?: { threadId?: unknown } } | null;
					try {
						state = parseJson<typeof state>(row.state);
					} catch {
						logger.warn(`[${migrationName}] Skipped malformed checkpoint`, { runId: row.runId });
						continue;
					}
					const threadId = state?.persistence?.threadId;
					if (typeof threadId !== 'string') continue;

					await runQuery(
						`UPDATE ${table} SET ${threadIdColumn} = :threadId WHERE ${runIdColumn} = :runId`,
						{ threadId, runId: row.runId },
					);
				}
			},
		);
	}
}
