import { Table } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';

export class CreateWorkflowStepExecution1784890100000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'id', type: 'uuid', isPrimary: true },
					{ name: 'execution_id', type: 'uuid' },
					{ name: 'node_id', type: 'varchar' },
					{
						name: 'iteration',
						type: 'int',
						default: 0,
						comment: 'Which pass over a loop body this row belongs to. 0 for non-loops.',
					},
					{ name: 'status', type: 'varchar', length: '32' },
					// SPIKE: the four spawned-step columns, their check and indexes are added
					// to this create migration in place. A database that ran it before must
					// be dropped. Write an ALTER migration once engine v2 data must survive.
					{
						name: 'kind',
						type: 'varchar',
						length: '16',
						default: "'graph'",
						comment:
							"'graph' for a step the graph plans. 'spawned' for a step that runs one action of a declaring step.",
					},
					{
						name: 'declaring_step_id',
						type: 'uuid',
						isNullable: true,
						comment: 'For a spawned step: the step that declared its action.',
					},
					{
						name: 'round',
						type: 'int',
						isNullable: true,
						comment:
							'For a spawned step: the round of the declaring step that declared its action.',
					},
					{
						name: 'call_id',
						type: 'varchar',
						isNullable: true,
						comment: 'For a spawned step: the call id of its action, unique within the round.',
					},
					{
						name: 'outputs',
						type: 'jsonb',
						isNullable: true,
						comment:
							'Step outputs, persisted without inspection and reloaded as downstream inputs. Shape is step-type-specific.',
					},
					{
						name: 'error',
						type: 'jsonb',
						isNullable: true,
						comment: 'Name and message of the error that failed this step.',
					},
					{
						name: 'wait_declaration',
						type: 'jsonb',
						isNullable: true,
						comment:
							'What the step waits for, as its executor declared it. The engine reads three things: the deadline, the outputs the step emits when that deadline fires, and whether a request may end the wait. It does not read what the wait is for: a webhook, a form and an approval all look the same to it.',
					},
					{
						name: 'wait_till',
						type: 'timestamptz',
						precision: 3,
						isNullable: true,
						comment:
							"The wait's deadline, lifted out of `wait_declaration` so the sweep can index it.",
					},
					{
						name: 'resume_cause',
						type: 'jsonb',
						isNullable: true,
						comment:
							"What ended the step's wait, recorded when it is resumed: a deadline, or a request. A request carries the outputs the node's resume path produced where the request arrived. The engine emits them and runs no node code.",
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
				],
				indices: [
					// Index execution, node and iteration to look up inputs on the hot path.
					// Unique to prevent double writes on failure recovery, and keyed per pass
					// because a node inside a loop body runs once per pass. Graph steps only:
					// spawned steps of one node share the node and the iteration.
					{
						name: 'uniq_workflow_step_execution_execution_id_node_id_iteration',
						columnNames: ['execution_id', 'node_id', 'iteration'],
						isUnique: true,
						where: "kind = 'graph'",
					},
					// One spawned step for each action. Also serves the continuation and
					// the wake check, which read the spawned steps of one declaring step.
					{
						name: 'uniq_workflow_step_execution_declaring_step_id_round_call_id',
						columnNames: ['declaring_step_id', 'round', 'call_id'],
						isUnique: true,
						where: "kind = 'spawned'",
					},
					// The other indexes on `execution_id` are partial and skip spawned rows.
					// This one serves the cascade when an execution is deleted.
					{
						name: 'idx_workflow_step_execution_execution_id',
						columnNames: ['execution_id'],
					},
					// Partial index for the failed-sibling checks: they run on every event, and
					// loops make an execution's row count scale with its data. Graph steps
					// only, because a failed action does not fail the execution.
					{
						name: 'idx_workflow_step_execution_failed',
						columnNames: ['execution_id'],
						where: "status = 'failed' AND kind = 'graph'",
					},
					// The sweep reads waiting rows only, so the index is partial.
					{
						name: 'idx_workflow_step_execution_wait_till',
						columnNames: ['wait_till'],
						where: "status = 'waiting'",
					},
					// For the live-status refresh, on every suspension and settlement.
					// `status` in the key keeps its probes index-only; settled rows drop out.
					{
						name: 'idx_workflow_step_execution_unsettled',
						columnNames: ['execution_id', 'status'],
						where: "status IN ('queued', 'running', 'waiting')",
					},
				],
				foreignKeys: [
					{
						columnNames: ['execution_id'],
						referencedTableName: 'workflow_execution',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
					{
						columnNames: ['declaring_step_id'],
						referencedTableName: TABLE,
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
				],
				checks: [
					{
						name: 'chk_workflow_step_execution_status',
						expression:
							"status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'skipped', 'cancelled')",
					},
					{
						name: 'chk_workflow_step_execution_kind',
						expression:
							"(kind = 'graph' AND declaring_step_id IS NULL AND round IS NULL AND call_id IS NULL) OR (kind = 'spawned' AND declaring_step_id IS NOT NULL AND round IS NOT NULL AND call_id IS NOT NULL)",
					},
				],
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
