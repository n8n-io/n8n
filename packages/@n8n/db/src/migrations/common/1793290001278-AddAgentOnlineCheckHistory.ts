import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentOnlineCheckHistory1793290001278 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_online_check_case')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('agentId').varchar(36).notNull,
				column('threadId').varchar(36).comment('Source session; null after the session is deleted'),
				column('ownerId').uuid.comment('Private session owner; null for a shared project session'),
				column('title').text.notNull,
				column('turns').json.notNull.comment(
					'Fixed recorded conversation and tool timeline used for checks',
				),
			)
			.withCreatedAt.withIndexOn(['agentId', 'threadId'], true)
			.withIndexOn('threadId')
			.withIndexOn('ownerId')
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('threadId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('ownerId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' });
		await createTable('agent_online_check_result')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('caseId').int.notNull,
				column('rubric').json.notNull.comment(
					'Checks and generation date used for this assessment',
				),
				column('configHash').text.notNull.comment('Agent configuration hash at assessment time'),
				column('verdicts').json.notNull.comment('One verdict and reason for each check'),
			)
			.withCreatedAt.withIndexOn('caseId')
			.withForeignKey('caseId', {
				tableName: 'agent_online_check_case',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}
	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_online_check_result');
		await dropTable('agent_online_check_case');
	}
}
