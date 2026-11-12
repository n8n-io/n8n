import type { MigrationContext, ReversibleMigration } from '../migration-types';

const firstRetryDelaySeconds = 60;

export class AddRetryDelayToWorkflowPublicationRetryState1794320866222
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		const { addColumns, column } = context.schemaBuilder;

		await addColumns(
			'workflow_publication_retry_state',
			[
				column('retryDelaySeconds').int.comment(
					'Seconds after updatedAt when reconciliation retries the target; null means never',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await this.scheduleNotesAtActiveVersion(context);
		await this.scheduleWorkflowsWithFailedTriggers(context);
	}

	async down(context: MigrationContext) {
		await this.deletePartialWorkflowNotes(context);
		await context.schemaBuilder.dropColumns(
			'workflow_publication_retry_state',
			['retryDelaySeconds'],
			{ recreatesOnSqlite: true },
		);
	}

	private async scheduleNotesAtActiveVersion({ escape, runQuery }: MigrationContext) {
		const retryState = escape.tableName('workflow_publication_retry_state');
		const workflow = escape.tableName('workflow_entity');

		await runQuery(
			`UPDATE ${retryState} SET "retryDelaySeconds" = ${firstRetryDelaySeconds}
			 WHERE EXISTS (
				 SELECT 1 FROM ${workflow} w
				 WHERE w."id" = ${retryState}."workflowId"
				 AND w."activeVersionId" = ${retryState}."targetVersionId"
			 )`,
		);
	}

	/** Partial publications deleted their note, so their failed triggers need a new one. */
	private async scheduleWorkflowsWithFailedTriggers({ escape, runQuery }: MigrationContext) {
		const retryState = escape.tableName('workflow_publication_retry_state');
		const workflow = escape.tableName('workflow_entity');
		const triggerStatus = escape.tableName('workflow_publication_trigger_status');

		await runQuery(
			`INSERT INTO ${retryState} ("workflowId", "targetVersionId", "retryDelaySeconds")
			 SELECT w."id", w."activeVersionId", ${firstRetryDelaySeconds}
			 FROM ${workflow} w
			 WHERE w."activeVersionId" IS NOT NULL
			 AND EXISTS (
				 SELECT 1 FROM ${triggerStatus} ts
				 WHERE ts."workflowId" = w."id"
				 AND ts."versionId" = w."activeVersionId"
				 AND ts."status" = 'failed'
			 )
			 AND NOT EXISTS (
				 SELECT 1 FROM ${retryState} r WHERE r."workflowId" = w."id"
			 )`,
		);
	}

	/** The old code keeps no note for a partial publication and reads any note as permanent. */
	private async deletePartialWorkflowNotes({ escape, runQuery }: MigrationContext) {
		const retryState = escape.tableName('workflow_publication_retry_state');
		const triggerStatus = escape.tableName('workflow_publication_trigger_status');

		await runQuery(
			`DELETE FROM ${retryState}
			 WHERE "retryDelaySeconds" IS NOT NULL
			 AND EXISTS (
				 SELECT 1 FROM ${triggerStatus} ts
				 WHERE ts."workflowId" = ${retryState}."workflowId"
				 AND ts."versionId" = ${retryState}."targetVersionId"
				 AND ts."status" = 'activated'
			 )`,
		);
	}
}
