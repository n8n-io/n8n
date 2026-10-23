import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSelfHealingInvestigationTable1792578704944 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex }, escape }: MigrationContext) {
		await createTable('self_healing_investigation')
			.withColumns(
				column('id').varchar(36).primary,
				column('workflowId').varchar(36).notNull.comment('Investigated workflow'),
				column('projectId').varchar(36).notNull.comment('Workflow owner project at admission'),
				column('backgroundUserId').uuid.notNull.comment('User who enabled the investigation'),
				column('executionId')
					.varchar(36)
					.notNull.comment(
						'Original execution reference retained after pruning; supports both execution engines',
					),
				column('threadId').uuid.notNull.comment(
					'Private Assistant thread ID; retained after deletion',
				),
				column('runId').uuid.notNull.comment(
					'Assistant run ID; technical status stays in run events',
				),
				column('baseline').json.notNull.comment(
					'Workflow snapshot and version checks captured at admission',
				),
				column('resultId').varchar(36).comment('Result saved by atomic investigation completion'),
				column('finishedAt')
					.timestampTimezone()
					.comment('When the investigation released its workflow claim'),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn(['workflowId', 'executionId'], true)
			.withIndexOn('projectId')
			.withIndexOn('backgroundUserId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('backgroundUserId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resultId', {
				tableName: 'self_healing_result',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
		await createIndex(
			'self_healing_investigation',
			['workflowId'],
			true,
			undefined,
			`${escape.columnName('finishedAt')} IS NULL`,
		);
		await createIndex(
			'self_healing_investigation',
			['resultId'],
			true,
			undefined,
			`${escape.columnName('resultId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('self_healing_investigation');
	}
}
