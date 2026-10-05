import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSelfHealingResultTable1791186551303 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex }, escape }: MigrationContext) {
		await createTable('self_healing_result')
			.withColumns(
				column('id').varchar(36).primary,
				column('workflowId').varchar(36).notNull.comment('Investigated workflow'),
				column('projectId').varchar(36).notNull.comment('Original workflow owner project'),
				column('backgroundUserId').uuid.notNull.comment('User who enabled the investigation'),
				column('outcome')
					.varchar(16)
					.notNull.withEnumCheck(['fix_ready', 'needs_you', 'could_not_fix'])
					.comment('Accepted investigation outcome, separate from review closure'),
				column('summary').varchar(2000).notNull,
				column('report').text.notNull.comment(
					'Saved report, independent of execution and chat data',
				),
				column('completedAt').timestampTimezone().notNull,
				column('executionId')
					.varchar(255)
					.comment(
						'Execution reference retained after pruning; also supports the external v2 data plane',
					),
				column('suggestionId').varchar(36).comment('Optional isolated workflow suggestion'),
				column('usage').json.comment(
					'Recorded credits, turns, and durationSeconds; null means unknown',
				),
				column('dismissedAt').timestampTimezone(),
				column('dismissedById').uuid.comment('Reviewer who dismissed the result'),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('workflowId')
			.withIndexOn('projectId')
			.withIndexOn('backgroundUserId')
			.withIndexOn('dismissedById')
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
			.withForeignKey('suggestionId', {
				tableName: 'workflow_suggestion',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('dismissedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
		await createIndex(
			'self_healing_result',
			['suggestionId'],
			true,
			undefined,
			`${escape.columnName('suggestionId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('self_healing_result');
	}
}
