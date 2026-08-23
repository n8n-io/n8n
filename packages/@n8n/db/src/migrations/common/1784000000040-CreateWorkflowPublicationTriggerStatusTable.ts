import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publication_trigger_status';

export class CreateWorkflowPublicationTriggerStatusTable1784000000040
	implements ReversibleMigration
{
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('workflowId').varchar(36).notNull.primary,
				column('nodeId').varchar(36).notNull.primary,
				column('versionId')
					.varchar(36)
					.notNull.comment(
						'References workflow_history.versionId: the published version these statuses were recorded for',
					),
				column('status').varchar(20).notNull.withEnumCheck(['activated', 'failed']),
				column('errorMessage').text,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('versionId', {
				tableName: 'workflow_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
