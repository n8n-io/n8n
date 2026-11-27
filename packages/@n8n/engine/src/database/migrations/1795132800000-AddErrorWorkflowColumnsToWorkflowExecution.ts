import { TableCheck, TableColumn, TableIndex } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_execution';
const UNIQUE_SOURCE_INDEX = 'idx_workflow_execution_error_source_execution_id';
const DUE_INDEX = 'idx_workflow_execution_error_workflow_due_at';
const SOURCE_CHECK = 'chk_workflow_execution_error_source';
const ONE_LINK_CHECK = 'chk_workflow_execution_one_link';

/**
 * Adds what an error execution needs: the link to the execution it reports on,
 * whether a failure of a run resolves an error workflow, and the marker of a pending one.
 */
export class AddErrorWorkflowColumnsToWorkflowExecution1795132800000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumns(TABLE, [
			new TableColumn({
				name: 'error_source_execution_id',
				type: 'uuid',
				isNullable: true,
				comment: 'The execution this error execution reports on. Null for any other execution.',
			}),
			new TableColumn({ name: 'error_source_workflow_id', type: 'varchar', isNullable: true }),
			new TableColumn({
				name: 'resolve_error_workflow_on_failure',
				type: 'boolean',
				isNullable: false,
				default: false,
				comment: 'Whether a failure of this execution resolves an error workflow.',
			}),
			new TableColumn({
				name: 'error_workflow_due_at',
				type: 'timestamptz',
				precision: 3,
				isNullable: true,
				comment: 'Set while an error execution is due. The repair acts after this time.',
			}),
		]);

		await queryRunner.createCheckConstraints(TABLE, [
			new TableCheck({
				name: SOURCE_CHECK,
				expression:
					'(error_source_execution_id IS NULL AND error_source_workflow_id IS NULL) OR (error_source_execution_id IS NOT NULL AND error_source_workflow_id IS NOT NULL)',
			}),
			// An error execution is a top-level execution.
			new TableCheck({
				name: ONE_LINK_CHECK,
				expression: 'error_source_execution_id IS NULL OR parent_execution_id IS NULL',
			}),
		]);

		await queryRunner.createIndices(TABLE, [
			// One error execution for each source. A second start finds the row and stops.
			new TableIndex({
				name: UNIQUE_SOURCE_INDEX,
				columnNames: ['error_source_execution_id'],
				isUnique: true,
				where: 'error_source_execution_id IS NOT NULL',
			}),
			// For the search for pending error executions. Only marked rows are in the index.
			new TableIndex({
				name: DUE_INDEX,
				columnNames: ['error_workflow_due_at'],
				where: 'error_workflow_due_at IS NOT NULL',
			}),
		]);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex(TABLE, DUE_INDEX);
		await queryRunner.dropIndex(TABLE, UNIQUE_SOURCE_INDEX);
		await queryRunner.dropCheckConstraint(TABLE, ONE_LINK_CHECK);
		await queryRunner.dropCheckConstraint(TABLE, SOURCE_CHECK);
		await queryRunner.dropColumns(TABLE, [
			'error_workflow_due_at',
			'resolve_error_workflow_on_failure',
			'error_source_workflow_id',
			'error_source_execution_id',
		]);
	}
}
