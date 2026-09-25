import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowSuggestionTables1790254283961 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { createTable, column, createIndex },
			escape,
		} = ctx;
		await createTable('workflow_suggestion')
			.withColumns(
				column('id').varchar().primary,
				column('sourceKey')
					.varchar(255)
					.notNull.comment('Stable investigation key. Retained after payload cleanup'),
				// Historical identities have no FK. A delayed retry must survive target deletion.
				column('workflowId')
					.varchar(36)
					.notNull.comment('Original workflow identity. Retained after deletion'),
				column('projectId')
					.varchar(36)
					.notNull.comment('Original owner project identity. Retained after deletion'),
				column('backgroundUserId').uuid.notNull.comment(
					'Original enabling user identity. Retained after deletion',
				),
				column('expectedBaseline').json.notNull.comment(
					'Original saved and published version IDs and checksum',
				),
				column('state')
					.varchar(16)
					.notNull.withEnumCheck(['preparing', 'pending', 'closed'])
					.comment('Suggestion lifecycle state'),
				column('revision').int.notNull,
				column('submittedRevision').int,
				column('closedReason')
					.varchar(16)
					.withEnumCheck(['outdated', 'abandoned', 'applied', 'discarded'])
					.comment('Reason the suggestion closed'),
				column('closedAt').timestampTimezone(),
				column('payload').json.comment(
					'Independent baseline, graph, explanation, validation, and error context. Removed on expiry',
				),
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('sourceKey', true)
			.withIndexOn(['state', 'updatedAt'])
			.withIndexOn(['state', 'closedAt']);
		await createIndex(
			'workflow_suggestion',
			['workflowId'],
			true,
			undefined,
			`${escape.columnName('state')} = 'pending'`,
		);
		await createTable('workflow_suggestion_activity')
			.withColumns(
				column('id').varchar().primary,
				column('suggestionId').varchar().notNull,
				column('action')
					.varchar(16)
					.notNull.withEnumCheck(['submitted'])
					.comment('Proposal activity action'),
				column('author')
					.varchar(16)
					.notNull.withEnumCheck(['assistant'])
					.comment('Authorship, separate from the background user'),
				column('revision').int.notNull,
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
