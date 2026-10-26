import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publication_outbox';
const columnName = 'reason';

/**
 * Adds `reason` so each publication record carries why it was enqueued: a user
 * publish/unpublish, the leader's startup pass, a leadership takeover, or the
 * reconciler healing drift. The applier translates it into the activation mode
 * reported to trigger nodes (e.g. the n8n Trigger's "Instance Started" event
 * fires only for `startup`).
 *
 * NOT NULL with a `publish` default so rows inserted by pre-upgrade instances
 * during a rolling deploy keep today's behavior (activation mode `update`).
 */
export class AddReasonToWorkflowPublicationOutbox1786519946974 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			tableName,
			[
				column(columnName)
					.varchar(20)
					.notNull.default("'publish'")
					.withEnumCheck(['publish', 'startup', 'leadership-takeover', 'reconcile'])
					.comment(
						'Why this publication was enqueued: user publish/unpublish, leader startup pass, leadership takeover, or reconciler drift-heal',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns, dropEnumCheck } }: MigrationContext) {
		await dropEnumCheck(tableName, columnName, { recreatesOnSqlite: true });
		await dropColumns(tableName, [columnName], { recreatesOnSqlite: true });
	}
}
