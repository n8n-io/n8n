import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';
const statusesBefore = ['running', 'success', 'error', 'cancelled', 'interrupted'];
const statusesAfter = ['queued', ...statusesBefore];

/**
 * One agent turn per thread at a time. A turn that arrives while the thread
 * runs is stored as a `queued` row; `resourceId` names the sender's memory
 * resource and `runContext` holds what the row needs to run later without its
 * request. `enqueueSequence` keeps each thread's durable arrival order. The
 * partial unique index rejects a second running row with a turn context for
 * the same thread. Rows from older mains and out-of-scope runs have no turn
 * context, so a rolling upgrade never trips the index.
 */
export class AddActiveThreadClaimToAgentExecution1789138249046 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, createIndex, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesAfter, { recreatesOnSqlite: true });

		// The schema builder rebuilds the table on SQLite.
		// Add these nullable columns in place.
		if (isSqlite) {
			const table = escape.tableName(executionTable);
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('resourceId')} varchar(255)`,
			);
			await runQuery(`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('runContext')} text`);
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('enqueueSequence')} integer`,
			);
		} else {
			await addColumns(
				executionTable,
				[
					column('resourceId')
						.varchar(255)
						.comment('Memory resource id of the sender, so a queued turn later runs as that user'),
					column('runContext').json.comment(
						'Turn kind and inbound context a queued turn needs to run without its request; null once the run ends',
					),
					column('enqueueSequence').int.comment(
						'Per-thread order assigned when an agent turn enters the durable queue',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}
		await createIndex(
			executionTable,
			['threadId'],
			true,
			undefined,
			`${escape.columnName('runContext')} IS NOT NULL AND ${escape.columnName('status')} = 'running'`,
		);
		await createIndex(executionTable, ['threadId', 'enqueueSequence'], true);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { dropColumns, dropIndex, addEnumCheck, dropEnumCheck },
	}: MigrationContext) {
		await dropIndex(executionTable, ['threadId', 'enqueueSequence']);
		await dropIndex(executionTable, ['threadId']);

		// A queued row never ran, so it ends as cancelled once the status is gone.
		await runQuery(
			`UPDATE ${escape.tableName(executionTable)} ` +
				`SET ${escape.columnName('status')} = 'cancelled' ` +
				`WHERE ${escape.columnName('status')} = 'queued'`,
		);
		await dropEnumCheck(executionTable, 'status', { recreatesOnSqlite: true });
		await addEnumCheck(executionTable, 'status', statusesBefore, { recreatesOnSqlite: true });

		// Drop the columns last. On SQLite the check rebuild above copies the table
		// from the definition it loaded first, which brings dropped columns back.
		const columns = ['resourceId', 'runContext', 'enqueueSequence'];
		if (isSqlite) {
			for (const name of columns) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName(name)}`,
				);
			}
		} else {
			await dropColumns(executionTable, columns, { recreatesOnSqlite: true });
		}
	}
}
