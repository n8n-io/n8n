import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentOnlineCheckReviews1793291667365 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_online_check_review')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('resultId').int.notNull,
				column('userId').uuid.comment('Reviewer; null after the user is deleted'),
				column('checkId').text.notNull.comment('Check ID in the assessment rubric'),
				column('feedback')
					.varchar(4)
					.notNull.withEnumCheck(['good', 'bad'])
					.comment('Human assessment of the recorded response'),
			)
			.withCreatedAt.withIndexOn('resultId')
			.withIndexOn('userId')
			.withForeignKey('resultId', {
				tableName: 'agent_online_check_result',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });
	}
	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_online_check_review');
	}
}
