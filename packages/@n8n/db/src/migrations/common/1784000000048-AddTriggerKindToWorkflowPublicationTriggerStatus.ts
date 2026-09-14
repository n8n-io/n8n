import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publication_trigger_status';
const columnName = 'triggerKind';

/**
 * Adds `triggerKind` so a reconciler can tell in-memory triggers (nodes with a
 * poll/trigger function, held on an instance) apart from persisted triggers
 * (webhook-only nodes, stored in `webhook_entity`).
 *
 * The table is a publication-outcome cache, fully replaced on every publish, so
 * existing rows are cleared rather than backfilled: the column is populated
 * again during application startup after migrations run, when the leader
 * enqueues and processes a publication record for every active workflow.
 */
export class AddTriggerKindToWorkflowPublicationTriggerStatus1784000000048
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column }, runQuery, escape }: MigrationContext) {
		await runQuery(`DELETE FROM ${escape.tableName(tableName)}`);

		await addColumns(
			tableName,
			[
				column(columnName)
					.varchar(20)
					.notNull.withEnumCheck(['in-memory', 'persisted'])
					.comment(
						'Where the trigger lives once activated: in-memory (registered on the owning instance) vs persisted (webhook row in webhook_entity)',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, [columnName], { recreatesOnSqlite: true });
	}
}
