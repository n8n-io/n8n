import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publication_trigger_status';
const columnName = 'triggerKind';

/**
 * Adds `triggerKind` so a reconciler can tell in-memory triggers (poll/trigger,
 * held on an instance) apart from webhook triggers (stored in `webhook_entity`).
 *
 * The table is a publication-outcome cache, fully replaced on every publish, so
 * existing rows are cleared rather than backfilled: the column is populated
 * again during application startup after migrations run, when the leader
 * enqueues and processes a publication record for every active workflow.
 */
export class AddTriggerKindToWorkflowPublicationTriggerStatus1784000000046
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column }, runQuery, escape }: MigrationContext) {
		await runQuery(`DELETE FROM ${escape.tableName(tableName)}`);

		await addColumns(
			tableName,
			[
				column(columnName)
					.varchar(20)
					.notNull.withEnumCheck(['webhook', 'poll', 'trigger'])
					.comment(
						'Trigger execution mechanism: webhook (stored in webhook_entity) vs poll/trigger (held in memory)',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, [columnName], { recreatesOnSqlite: true });
	}
}
