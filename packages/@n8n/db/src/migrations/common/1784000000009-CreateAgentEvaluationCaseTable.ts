import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AGENT_REVIEW_REJECTION_REASONS = ['wrong_answer', 'wrong_tool_calling', 'other'];

export class CreateAgentEvaluationCaseTable1784000000009 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_evaluation_case')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('projectId').varchar(255).notNull,
				column('agentId').varchar(36).notNull,
				column('agentVersionId').varchar(255).notNull,
				column('conversationId').varchar(36).notNull,
				column('executionId').varchar(36).notNull,
				column('status').varchar(16).notNull.withEnumCheck(['approved', 'rejected']),
				column('rejectionReason').varchar(32).withEnumCheck(AGENT_REVIEW_REJECTION_REASONS),
				column('toolCallCorrection').json,
				column('input').text.notNull,
				column('expectedOutput').text.notNull,
				column('actualOutput').text.notNull,
				column('notes').text,
				column('createdById').uuid,
				column('updatedById').uuid,
			)
			.withIndexOn('projectId')
			.withIndexOn(['agentId', 'status', 'updatedAt'])
			.withIndexOn(['agentId', 'agentVersionId', 'status', 'updatedAt'])
			.withIndexOn('executionId', true)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('executionId', {
				tableName: 'agent_execution',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('updatedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_evaluation_case');
	}
}
