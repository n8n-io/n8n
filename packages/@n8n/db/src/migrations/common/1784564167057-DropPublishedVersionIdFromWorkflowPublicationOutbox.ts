import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Outbox records are pure "reconcile this workflow" markers: the applier
 * derives the publish target from `workflow_entity.activeVersionId` at claim
 * time, so `publishedVersionId` is written by no code path and read by none.
 * Dropping it needs no deprecation release: every writer of this table is
 * gated behind `N8N_USE_WORKFLOW_PUBLICATION_SERVICE` (default off), so a
 * same-schema image downgrade cannot break unflagged instances, and the few
 * flagged ones are centrally managed and can `db:revert`.
 *
 * `workflow_publication_outbox` has no incoming foreign keys, so the SQLite
 * table recreation behind `dropColumns`/`addColumns` cannot cascade into other
 * tables.
 */
export class DropPublishedVersionIdFromWorkflowPublicationOutbox1784564167057
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_publication_outbox', ['publishedVersionId'], {
			recreatesOnSqlite: true,
		});
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, addNotNull, column },
		} = ctx;

		await addColumns('workflow_publication_outbox', [column('publishedVersionId').varchar(36)], {
			recreatesOnSqlite: true,
		});
		await this.backfillVersions(ctx);
		await addNotNull('workflow_publication_outbox', 'publishedVersionId', {
			recreatesOnSqlite: true,
		});
	}

	/**
	 * Restore the value the previous release would have written: the workflow's
	 * `activeVersionId`, or the unpublish sentinel when the workflow is
	 * unpublished or gone.
	 */
	private async backfillVersions({ escape, runQuery }: MigrationContext) {
		const outbox = escape.tableName('workflow_publication_outbox');
		const workflow = escape.tableName('workflow_entity');

		await runQuery(
			`UPDATE ${outbox}
			 SET "publishedVersionId" = COALESCE(
				 (SELECT w."activeVersionId" FROM ${workflow} w WHERE w."id" = ${outbox}."workflowId"),
				 '__unpublish__'
			 )
			 WHERE "publishedVersionId" IS NULL`,
		);
	}
}
