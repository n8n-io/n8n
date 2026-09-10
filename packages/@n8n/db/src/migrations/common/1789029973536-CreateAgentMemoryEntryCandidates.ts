import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const candidateTable = 'agents_memory_entry_candidates';
const cursorTable = 'agents_memory_entry_cursors';
const entryTable = 'agents_memory_entries';
const sourceTable = 'agents_memory_entry_sources';
const candidateIdColumn = 'candidateId';
const sourceCheck = 'agents_memory_entry_sources_exactly_one_source';
const candidateSourceUniqueIndex = 'agents_mem_src_candidate_unique';
const captureStatuses = ['pending', 'completed', 'failed'];

export class CreateAgentMemoryEntryCandidates1789029973536 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			queryRunner,
			schemaBuilder: {
				addColumns,
				addForeignKey,
				column,
				createIndex,
				createTable,
				dropNotNull,
				dropTable,
			},
			tablePrefix,
		} = context;

		await createTable(candidateTable)
			.withColumns(
				column('id').varchar(36).primary,
				column('agentId')
					.varchar(36)
					.notNull.comment('Agent that owns this episodic memory capture candidate'),
				column('resourceId')
					.varchar(255)
					.notNull.comment('Resource scope for the eventual episodic memory entry'),
				column('threadId')
					.varchar(255)
					.notNull.comment('Conversation thread where the agent flagged this candidate'),
				column('sourceMessageId')
					.varchar(36)
					.comment('Persisted message that contains the exact source evidence'),
				column('runId')
					.varchar(255)
					.notNull.comment('Agent run that issued the memory capture tool call'),
				column('toolCallId')
					.varchar(255)
					.notNull.comment('Model tool-call ID used to make enqueue replay-safe'),
				column('content').text.notNull.comment('Agent-proposed durable memory content'),
				column('evidenceText').text.notNull.comment(
					'Redacted exact evidence from the source message',
				),
				column('kind')
					.varchar(32)
					.notNull.comment(
						'Reason the agent flagged this candidate; see EpisodicMemoryCaptureKind in @n8n/agents',
					),
				column('status')
					.varchar(16)
					.notNull.default("'pending'")
					.withEnumCheck(captureStatuses)
					.comment('Candidate processing state'),
				column('attemptCount')
					.smallint.notNull.default(0)
					.comment('Number of failed processing attempts'),
			)
			.withTimestamps.withIndexOn(['agentId', 'runId', 'toolCallId'], true)
			.withIndexOn(['agentId', 'resourceId', 'status', 'createdAt', 'id'])
			.withIndexOn('resourceId')
			.withIndexOn('threadId')
			.withIndexOn('sourceMessageId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resourceId', {
				tableName: 'agents_resources',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('threadId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('sourceMessageId', {
				tableName: 'agents_messages',
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		await addColumns(
			sourceTable,
			[column(candidateIdColumn).varchar(36).comment('Capture candidate used as source evidence')],
			{
				recreatesOnSqlite: true,
			},
		);
		await dropNotNull(sourceTable, 'observationId', { recreatesOnSqlite: true });
		await addForeignKey(
			sourceTable,
			candidateIdColumn,
			[candidateTable, 'id'],
			undefined,
			'CASCADE',
		);
		await createIndex(sourceTable, [candidateIdColumn]);
		await createIndex(
			sourceTable,
			['memoryEntryId', candidateIdColumn, 'evidenceHash'],
			true,
			`IDX_${tablePrefix}${candidateSourceUniqueIndex}`,
			`"${candidateIdColumn}" IS NOT NULL`,
		);
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${sourceTable}`,
			new TableCheck({
				name: `CHK_${tablePrefix}${sourceCheck}`,
				expression:
					'("observationId" IS NOT NULL AND "candidateId" IS NULL) OR ("observationId" IS NULL AND "candidateId" IS NOT NULL)',
			}),
		);
		if (context.isPostgres) {
			await this.commentSourceColumns(context, [
				['threadId', 'Source conversation thread for this evidence'],
				['evidenceText', 'Exact source evidence text, not recall scope'],
			]);
		}
		// Agent-directed capture replaces observation-log indexing, so nothing writes the cursor.
		await dropTable(cursorTable);
	}

	async down(context: MigrationContext) {
		const {
			escape,
			queryRunner,
			schemaBuilder: {
				addNotNull,
				column,
				createTable,
				dropColumns,
				dropForeignKey,
				dropIndex,
				dropTable,
			},
			tablePrefix,
		} = context;

		await createTable(cursorTable)
			.withColumns(
				column('agentId').varchar(36).notNull.primary.comment('Agent that owns this cursor'),
				column('observationScopeId')
					.varchar(255)
					.notNull.primary.comment('agents_threads.id source stream indexed into episodic memory'),
				column('lastIndexedObservationId')
					.varchar(36)
					.notNull.comment('Last observation-log row indexed into episodic memory'),
				column('lastIndexedObservationCreatedAt')
					.timestampTimezone(3)
					.notNull.comment('Creation timestamp for the last indexed observation-log row'),
			)
			.withIndexOn('observationScopeId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('observationScopeId', {
				tableName: 'agents_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${sourceTable}`,
			`CHK_${tablePrefix}${sourceCheck}`,
		);
		await context.runQuery(
			`UPDATE ${escape.tableName(entryTable)}
			 SET ${escape.columnName('status')} = 'dropped',
			     ${escape.columnName('supersededBy')} = NULL,
			     ${escape.columnName('updatedAt')} = CURRENT_TIMESTAMP
			 WHERE ${escape.columnName('status')} = 'active'
			   AND ${escape.columnName('id')} IN (
			     SELECT candidateSource.${escape.columnName('memoryEntryId')}
			     FROM ${escape.tableName(sourceTable)} candidateSource
			     WHERE candidateSource.${escape.columnName(candidateIdColumn)} IS NOT NULL
			       AND NOT EXISTS (
			         SELECT 1
			         FROM ${escape.tableName(sourceTable)} observationSource
			         WHERE observationSource.${escape.columnName('memoryEntryId')} =
			           candidateSource.${escape.columnName('memoryEntryId')}
			           AND observationSource.${escape.columnName('observationId')} IS NOT NULL
			       )
			   )`,
		);
		await context.runQuery(
			`DELETE FROM ${escape.tableName(sourceTable)} WHERE ${escape.columnName(candidateIdColumn)} IS NOT NULL`,
		);
		await dropIndex(sourceTable, ['memoryEntryId', candidateIdColumn, 'evidenceHash'], {
			customIndexName: `IDX_${tablePrefix}${candidateSourceUniqueIndex}`,
		});
		await dropIndex(sourceTable, [candidateIdColumn]);
		await dropForeignKey(sourceTable, candidateIdColumn, [candidateTable, 'id']);
		if (context.isPostgres) {
			await this.commentSourceColumns(context, [
				['threadId', 'Source conversation thread that produced the linked observation'],
				['evidenceText', 'Exact source evidence text from the observation, not recall scope'],
			]);
		}
		await addNotNull(sourceTable, 'observationId', { recreatesOnSqlite: true });
		await dropColumns(sourceTable, [candidateIdColumn], { recreatesOnSqlite: true });
		await dropTable(candidateTable);
	}

	private async commentSourceColumns(
		context: MigrationContext,
		comments: Array<[columnName: string, comment: string]>,
	): Promise<void> {
		for (const [columnName, comment] of comments) {
			await context.runQuery(
				`COMMENT ON COLUMN ${context.escape.tableName(sourceTable)}.${context.escape.columnName(columnName)} IS '${comment}'`,
			);
		}
	}
}
