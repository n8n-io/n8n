import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowSuggestionReviewState1791285202635 implements ReversibleMigration {
	async up({ schemaBuilder: s }: MigrationContext) {
		await s.addColumns(
			'workflow_suggestion',
			[
				s
					.column('resultKind')
					.varchar(16)
					.notNull.withEnumCheck(['fix_ready', 'needs_you'])
					.comment('Investigation outcome; only fix_ready permits Apply'),
				s.column('appliedVersion').json.comment('Saved version, checksum, action, and human actor'),
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
	}

	async down({ schemaBuilder: s }: MigrationContext) {
		await s.dropForeignKey(
			'workflow_suggestion_activity',
			'actorId',
			['user', 'id'],
			'FK_workflow_suggestion_activity_actor',
		);
		await s.dropIndex('workflow_suggestion_activity', ['actorId']);
		await s.dropColumns('workflow_suggestion_activity', ['actorId'], { recreatesOnSqlite: true });
		await s.dropEnumCheck('workflow_suggestion', 'resultKind', { recreatesOnSqlite: true });
		await s.dropColumns('workflow_suggestion', ['resultKind', 'appliedVersion'], {
			recreatesOnSqlite: true,
		});
	}
}
