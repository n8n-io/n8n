import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'publish_judge_review';

/**
 * One row for each time a judge reviews a workflow or an agent. It is a history: it keeps the
 * names it saw, so a row stays readable after the judge or the reviewed item is deleted.
 */
export class CreatePublishJudgeReviewTable1794997575396 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('event')
					.varchar(32)
					.notNull.withEnumCheck(['workflowPublish', 'workflowSave', 'agentPublish', 'agentSave'])
					.comment('What the builder did when the review ran'),
				column('subjectKind')
					.varchar(16)
					.notNull.withEnumCheck(['workflow', 'agent'])
					.comment('Whether the reviewed item is a workflow or an agent'),
				column('subjectId')
					.varchar(36)
					.comment(
						'Id of the reviewed workflow or agent. Null for one that is not saved yet. No FK: the history outlives the item',
					),
				column('subjectName').text.notNull,
				column('versionId')
					.varchar(64)
					.notNull.comment('Version id for a publish. Hash of the content for a save'),
				column('projectId').varchar(36).comment('Project of the reviewed item'),
				column('judgeScope')
					.varchar(16)
					.notNull.withEnumCheck(['instance', 'project'])
					.comment('Whether the instance judge or the project judge ran'),
				column('judgeType')
					.varchar(16)
					.notNull.withEnumCheck(['workflow', 'agent'])
					.comment('Whether the judge is a workflow or an agent'),
				column('judgeId')
					.varchar(36)
					.notNull.comment(
						'Id of the judge workflow or agent. No FK: the history outlives the judge',
					),
				column('judgeName').text.notNull,
				column('verdict')
					.varchar(16)
					.notNull.withEnumCheck(['allowed', 'refused', 'noAnswer'])
					.comment('What the judge answered. noAnswer means it failed or timed out'),
				column('reason').text.comment('Reason that the judge gave to the builder'),
				column('durationMs').int.notNull,
				column('runRef')
					.varchar(64)
					.comment('Execution id of a workflow judge run, or session id of an agent judge run'),
				column('dryRun')
					.bool.notNull.default(false)
					.comment('The judge only recorded its verdict and blocked nothing'),
				column('blocked')
					.bool.notNull.default(false)
					.comment('The review stopped the publish or the save'),
			)
			.withTimestamps.withIndexOn(['createdAt'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
