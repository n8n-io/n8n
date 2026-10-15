import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowSuggestionTables1790928780672 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { createTable, column, createIndex },
			escape,
		} = ctx;
		await createTable('workflow_suggestion')
			.withColumns(
				column('id').varchar(36).primary,
				column('workflowId').varchar(36).notNull.comment('Target workflow'),
				column('projectId').varchar(36).notNull.comment('Original owner project'),
				column('backgroundUserId').uuid.notNull.comment('User who enabled the investigation'),
				column('expectedBaseline').json.notNull.comment(
					'savedVersionId, publishedVersionId, and checksum captured from the original workflow',
				),
				column('state')
					.varchar(16)
					.notNull.withEnumCheck(['pending', 'closed'])
					.comment('Suggestion lifecycle state'),
				column('closedReason')
					.varchar(16)
					.withEnumCheck(['outdated', 'applied', 'discarded'])
					.comment('Reason the suggestion closed'),
				column('closedAt').timestampTimezone(),
				column('payload').json.notNull.comment(
					'Original workflow snapshot, candidate nodes and connections, explanation, and error context',
				),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('workflowId')
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
			});
		await createIndex(
			'workflow_suggestion',
			['workflowId'],
			true,
			undefined,
			`${escape.columnName('state')} = 'pending'`,
		);
		await createTable('workflow_suggestion_activity')
			.withColumns(
				column('id').varchar(36).primary,
				column('suggestionId').varchar(36).notNull,
				column('action')
					.varchar(16)
					.notNull.withEnumCheck([
						'submitted',
						'applied',
						'discarded',
						'outdated',
						'published',
						'publish_failed',
					])
					.comment('Proposal activity action'),
				column('author')
					.varchar(16)
					.notNull.withEnumCheck(['assistant', 'human', 'system'])
					.comment('Authorship, separate from the background user'),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn(['suggestionId', 'action'], true)
			.withForeignKey('suggestionId', {
				tableName: 'workflow_suggestion',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_suggestion_activity');
		await dropTable('workflow_suggestion');
	}
}
