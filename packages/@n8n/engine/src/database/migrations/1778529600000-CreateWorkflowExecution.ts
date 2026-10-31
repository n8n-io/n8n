import { Table, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';

export class CreateWorkflowExecution1778529600000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true },
					{ name: 'workflow_id', type: 'varchar' },
					{ name: 'status', type: 'varchar', length: '32' },
					{ name: 'mode', type: 'varchar', length: '32' },
					{ name: 'graph', type: 'jsonb' },
					{ name: 'workflow', type: 'jsonb' },
					{ name: 'trigger_outputs', type: 'jsonb', isNullable: true },
					{
						name: 'caller_context',
						type: 'jsonb',
						comment:
							'Supplied by the caller at start (user, project, host mode). The engine stores and forwards it to step executors without reading it. Not the engine-internal per-request context.',
					},
					{
						name: 'response_expectation',
						type: 'jsonb',
						comment:
							'What kind of a response the caller expects (none, runEnd, stepResponse or stream)',
					},
					{
						name: 'parent_execution_id',
						type: 'uuid',
						isNullable: true,
						comment: 'The parent execution. Null for a top-level execution.',
					},
					{ name: 'parent_step_id', type: 'uuid', isNullable: true },
					{
						name: 'parent_awaited',
						type: 'boolean',
						isNullable: true,
						comment: 'Whether the parent step waits for this execution to end.',
					},
					{
						name: 'created_at',
						type: 'timestamptz',
						precision: 3,
						default: 'CURRENT_TIMESTAMP(3)',
					},
					{
						name: 'updated_at',
						type: 'timestamptz',
						precision: 3,
						default: 'CURRENT_TIMESTAMP(3)',
					},
					{ name: 'finished_at', type: 'timestamptz', precision: 3, isNullable: true },
				],
				checks: [
					{
						name: 'chk_workflow_execution_status',
						expression:
							"status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'cancelled')",
					},
					{
						name: 'chk_workflow_execution_parent',
						expression:
							'(parent_execution_id IS NULL AND parent_step_id IS NULL AND parent_awaited IS NULL) OR (parent_execution_id IS NOT NULL AND parent_step_id IS NOT NULL AND parent_awaited IS NOT NULL)',
					},
				],
			}),
		);

		await queryRunner.createIndices(TABLE, [
			new TableIndex({ name: 'idx_workflow_execution_workflow_id', columnNames: ['workflow_id'] }),
			new TableIndex({ name: 'idx_workflow_execution_status', columnNames: ['status'] }),
			// Partial: most executions have no parent, and a top-level insert then
			// never touches this index. A lookup by parent id still uses it.
			new TableIndex({
				name: 'idx_workflow_execution_parent_execution_id',
				columnNames: ['parent_execution_id'],
				where: 'parent_execution_id IS NOT NULL',
			}),
		]);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
