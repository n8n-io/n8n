import type { MigrationContext, ReversibleMigration } from '../migration-types';

const executionTable = 'agent_execution';

/**
 * One top-level agent turn can claim a thread at a time. Rows from older mains
 * and out-of-scope runs have no turn context, so a rolling upgrade never trips
 * the partial unique index.
 */
export class AddActiveThreadClaimToAgentExecution1789138249046 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { isSqlite, escape, runQuery, schemaBuilder } = ctx;
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} ADD COLUMN ${escape.columnName('runContext')} text`,
			);
		} else {
			await schemaBuilder.addColumns(
				executionTable,
				[
					schemaBuilder
						.column('runContext')
						.json.comment('Top-level turn context; null for internal runs and after the turn ends'),
				],
				{ recreatesOnSqlite: true },
			);
		}

		await schemaBuilder.createIndex(
			executionTable,
			['threadId'],
			true,
			undefined,
			`${escape.columnName('runContext')} IS NOT NULL AND ${escape.columnName('status')} = 'running'`,
		);
	}

	async down(ctx: MigrationContext) {
		const { isSqlite, escape, runQuery, schemaBuilder } = ctx;
		await schemaBuilder.dropIndex(executionTable, ['threadId']);
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(executionTable)} DROP COLUMN ${escape.columnName('runContext')}`,
			);
		} else {
			await schemaBuilder.dropColumns(executionTable, ['runContext'], {
				recreatesOnSqlite: true,
			});
		}
	}
}
