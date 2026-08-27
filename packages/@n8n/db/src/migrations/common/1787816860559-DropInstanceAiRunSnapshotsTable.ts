import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_run_snapshots';

interface SnapshotAnchorRow {
	threadId: string;
	runId: string;
	langsmithRunId: string;
	langsmithTraceId: string;
}

interface RunStartRow {
	seq: number;
	payload: string;
}

/**
 * Stored event envelope (`JSON.parse` of the row's `payload` column). Only the
 * inner `payload` object is typed — every other field must survive the
 * parse/patch/stringify round trip untouched.
 */
interface RunStartEnvelope {
	[key: string]: unknown;
	payload: Record<string, unknown>;
}

/**
 * Parse a stored run-start envelope. Returns null when the JSON is malformed
 * or is not an object carrying an object `payload` — one bad row must never
 * fail the migration, so the caller skips it with a warning.
 */
function parseRunStartEnvelope(raw: string): RunStartEnvelope | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const payload = (parsed as { payload?: unknown }).payload;
			if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
				return parsed as RunStartEnvelope;
			}
		}
	} catch {
		// fall through
	}
	return null;
}

/**
 * Copy the LangSmith feedback anchors from the snapshot columns onto the
 * matching `run-start` facts before the table drops. No pre-relocation row
 * carries the ids (the live writer only starts stamping them in this release,
 * and the INS-851 backfill deliberately left them on the columns), so without
 * the copy `findLangsmithAnchor` would resolve nothing for pre-deploy runs and
 * feedback on those threads would silently stop annotating LangSmith.
 * Snapshots without a matching run-start have nothing to anchor and are
 * skipped silently; payloads that already carry an anchor are left untouched,
 * so a re-run is idempotent.
 */
async function copyLangsmithAnchorsToRunStarts({
	logger,
	migrationName,
	escape,
	runQuery,
	runInBatches,
}: MigrationContext) {
	const snapshotsTable = escape.tableName(table);
	const eventsTable = escape.tableName('instance_ai_events');
	const threadIdColumn = escape.columnName('threadId');
	const runIdColumn = escape.columnName('runId');
	const seqColumn = escape.columnName('seq');
	const payloadColumn = escape.columnName('payload');
	const langsmithRunIdColumn = escape.columnName('langsmithRunId');
	const langsmithTraceIdColumn = escape.columnName('langsmithTraceId');

	await runInBatches<SnapshotAnchorRow>(
		`SELECT ${threadIdColumn} AS ${escape.columnName('threadId')},
		        ${runIdColumn} AS ${escape.columnName('runId')},
		        ${langsmithRunIdColumn} AS ${escape.columnName('langsmithRunId')},
		        ${langsmithTraceIdColumn} AS ${escape.columnName('langsmithTraceId')}
		 FROM ${snapshotsTable}
		 WHERE ${langsmithRunIdColumn} IS NOT NULL AND ${langsmithTraceIdColumn} IS NOT NULL
		 ORDER BY ${threadIdColumn}, ${runIdColumn}`,
		async (snapshots) => {
			for (const snapshot of snapshots) {
				const runStarts = await runQuery<RunStartRow[]>(
					`SELECT ${seqColumn} AS ${escape.columnName('seq')},
					        ${payloadColumn} AS ${escape.columnName('payload')}
					 FROM ${eventsTable}
					 WHERE ${threadIdColumn} = :threadId AND ${runIdColumn} = :runId
					   AND ${escape.columnName('type')} = 'run-start'`,
					{ threadId: snapshot.threadId, runId: snapshot.runId },
				);
				for (const runStart of runStarts) {
					const envelope = parseRunStartEnvelope(runStart.payload);
					if (envelope === null) {
						logger.warn(
							`[${migrationName}] Skipping a malformed run-start payload while copying LangSmith anchors (threadId=${snapshot.threadId}, runId=${snapshot.runId}, seq=${runStart.seq})`,
						);
						continue;
					}
					if (envelope.payload.langsmithRunId) continue;
					envelope.payload.langsmithRunId = snapshot.langsmithRunId;
					envelope.payload.langsmithTraceId = snapshot.langsmithTraceId;
					await runQuery(
						`UPDATE ${eventsTable} SET ${payloadColumn} = :payload
						 WHERE ${threadIdColumn} = :threadId AND ${seqColumn} = :seq`,
						{ payload: JSON.stringify(envelope), threadId: snapshot.threadId, seq: runStart.seq },
					);
				}
			}
		},
		500,
	);
}

/**
 * The agent-tree snapshot store is retired: history and the SSE bootstrap
 * derive their trees by folding `instance_ai_events`, so the persisted tree is
 * no longer read or written. The LangSmith feedback anchor that used to live
 * here now rides on the durable log's `run-start` fact.
 *
 * Because no run-start row written before this release carries the anchor ids,
 * `up` first copies them from the snapshot columns onto the matching run-start
 * payloads — the "Gate B anchor relocation carries them over" promise the
 * INS-851 backfill documents — and only then drops the table.
 *
 * The `down` recreates the table at its final schema (base columns plus the
 * trace/LangSmith ids added by later migrations) so a rollback restores a
 * structurally-identical table — the historical rows are not recoverable.
 */
export class DropInstanceAiRunSnapshotsTable1787816860559 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await copyLangsmithAnchorsToRunStarts(context);
		await context.schemaBuilder.dropTable(table);
	}

	async down({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary.notNull,
				column('runId').varchar(36).primary.notNull,
				column('messageGroupId').varchar(36),
				column('runIds').json,
				column('tree').text.notNull,
				column('traceId').varchar(64),
				column('spanId').varchar(64),
				column('langsmithRunId').varchar(36),
				column('langsmithTraceId').varchar(36),
			)
			.withIndexOn(['threadId', 'messageGroupId'])
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}
}
