import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowSuggestionReviewState1790673246897 implements ReversibleMigration {
	async up({ schemaBuilder: s }: MigrationContext) {
		await s.addColumns(
			'workflow_suggestion',
			[
				s
					.column('resultKind')
					.varchar(16)
					.withEnumCheck(['fix_ready', 'needs_you'])
					.comment('Outcome supplied by the investigation; null does not permit Apply'),
				s
					.column('appliedVersion')
					.json.comment(
						'Saved version, original published version, checksum, action, and human actor',
					),
				s
					.column('publication')
					.json.comment('Last observed publication status for the applied version'),
			],
			{ recreatesOnSqlite: true },
		);
		await s.addColumns(
			'workflow_suggestion_activity',
			[
				s
					.column('actorId')
					.uuid.comment('Human who took the action; null for Assistant and system activity'),
			],
			{ recreatesOnSqlite: true },
		);
		await s.addForeignKey(
			'workflow_suggestion_activity',
			'actorId',
			['user', 'id'],
			'FK_workflow_suggestion_activity_actor',
			'SET NULL',
		);
		await s.createIndex('workflow_suggestion_activity', ['actorId']);
		await s.dropEnumCheck('workflow_suggestion_activity', 'action', { recreatesOnSqlite: true });
		await s.addEnumCheck(
			'workflow_suggestion_activity',
			'action',
			['submitted', 'applied', 'discarded', 'outdated', 'published', 'publish_failed'],
			{ recreatesOnSqlite: true },
		);
		await s.dropEnumCheck('workflow_suggestion_activity', 'author', { recreatesOnSqlite: true });
		await s.addEnumCheck(
			'workflow_suggestion_activity',
			'author',
			['assistant', 'human', 'system'],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: s, runQuery, escape }: MigrationContext) {
		await runQuery(`DELETE FROM ${escape.tableName('workflow_suggestion_activity')}
			WHERE ${escape.columnName('action')} <> 'submitted'`);
		await s.dropEnumCheck('workflow_suggestion_activity', 'author', { recreatesOnSqlite: true });
		await s.addEnumCheck('workflow_suggestion_activity', 'author', ['assistant'], {
			recreatesOnSqlite: true,
		});
		await s.dropEnumCheck('workflow_suggestion_activity', 'action', { recreatesOnSqlite: true });
		await s.addEnumCheck('workflow_suggestion_activity', 'action', ['submitted'], {
			recreatesOnSqlite: true,
		});
		await s.dropForeignKey(
			'workflow_suggestion_activity',
			'actorId',
			['user', 'id'],
			'FK_workflow_suggestion_activity_actor',
		);
		await s.dropIndex('workflow_suggestion_activity', ['actorId']);
		await s.dropColumns('workflow_suggestion_activity', ['actorId'], { recreatesOnSqlite: true });
		await s.dropEnumCheck('workflow_suggestion', 'resultKind', { recreatesOnSqlite: true });
		await s.dropColumns('workflow_suggestion', ['resultKind', 'appliedVersion', 'publication'], {
			recreatesOnSqlite: true,
		});
	}
}
