import type { MigrationContext, ReversibleMigration } from '../migration-types';

const indexColumns = ['agentId', 'threadId', 'expired', 'updatedAt'];
const indexName = 'agent_checkpoints_thread';

export class AddThreadIdToAgentCheckpoints1789717191125 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { addColumns, column, createIndex } = context.schemaBuilder;
		if (context.isSqlite) {
			await context.runQuery(
				`ALTER TABLE ${context.escape.tableName('agent_checkpoints')} ADD COLUMN ${context.escape.columnName('threadId')} TEXT`,
			);
		} else {
			await addColumns(
				'agent_checkpoints',
				[
					column('threadId').text.comment(
						'SDK thread key from checkpoint state. Execution history is optional.',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}
		await this.backfillThreadIds(context);
		await createIndex(
			'agent_checkpoints',
			indexColumns,
			false,
			`IDX_${context.tablePrefix}${indexName}`,
		);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns }, tablePrefix }: MigrationContext) {
		await dropIndex('agent_checkpoints', indexColumns, {
			customIndexName: `IDX_${tablePrefix}${indexName}`,
		});
		await dropColumns('agent_checkpoints', ['threadId'], { recreatesOnSqlite: true });
	}

	private async backfillThreadIds(context: MigrationContext) {
		const { escape, runInBatches, logger, migrationName } = context;
		const table = escape.tableName('agent_checkpoints');
		const runIdColumn = escape.columnName('runId');
		const stateColumn = escape.columnName('state');
		let updated = 0;
		let skipped = 0;

		// Updating threadId must not change the row set used by offset pagination.
		await runInBatches<{ runId: string; state: string }>(
			`SELECT ${runIdColumn}, ${stateColumn} FROM ${table} WHERE ${stateColumn} IS NOT NULL ORDER BY ${runIdColumn}`,
			async (rows) => {
				for (const row of rows) {
					if (await this.backfillCheckpoint(row, context)) {
						updated++;
					} else {
						skipped++;
					}
				}
			},
		);
		logger.info(
			`[${migrationName}] Backfilled ${updated} checkpoint thread IDs; skipped ${skipped} checkpoints.`,
		);
	}

	private async backfillCheckpoint(
		row: { runId: string; state: string },
		{ escape, runQuery, parseJson, logger, migrationName }: MigrationContext,
	) {
		let state: { persistence?: { threadId?: unknown } } | null;
		try {
			state = parseJson<typeof state>(row.state);
		} catch (error) {
			logger.warn(
				`[${migrationName}] Skipped malformed checkpoint ${row.runId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			return false;
		}
		const threadId = state?.persistence?.threadId;
		if (typeof threadId !== 'string') return false;
		await runQuery(
			`UPDATE ${escape.tableName('agent_checkpoints')} SET ${escape.columnName('threadId')} = :threadId WHERE ${escape.columnName('runId')} = :runId`,
			{ threadId, runId: row.runId },
		);
		return true;
	}
}
