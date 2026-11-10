import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentApprovalExecutionOwner1794243760175 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey, createIndex },
	}: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('approvalWorkflowId')
					.varchar(36)
					.comment('Private workflow that owns channel approval executions'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agents',
			'approvalWorkflowId',
			['workflow_entity', 'id'],
			'FK_agent_approval_execution_owner',
			'RESTRICT',
		);
		await createIndex('agents', ['approvalWorkflowId']);
	}

	async down({ schemaBuilder: { dropForeignKey, dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('agents', ['approvalWorkflowId']);
		await dropForeignKey(
			'agents',
			'approvalWorkflowId',
			['workflow_entity', 'id'],
			'FK_agent_approval_execution_owner',
		);
		await dropColumns('agents', ['approvalWorkflowId'], { recreatesOnSqlite: true });
	}
}
