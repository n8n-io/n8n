import { Table, TableForeignKey } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_seeded_step';

export class CreateWorkflowSeededStep1791417600000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: TABLE,
				columns: [
					{ name: 'execution_id', type: 'uuid', isPrimary: true },
					{ name: 'node_id', type: 'varchar', isPrimary: true },
					{
						name: 'iteration',
						type: 'int',
						isPrimary: true,
						comment: 'Which pass over a loop body these outputs belong to. 0 for non-loops.',
					},
					{
						name: 'outputs',
						type: 'jsonb',
						comment:
							'The outputs the caller supplied for this step, recorded as its outputs when the run reaches it. Same shape as workflow_step_execution.outputs.',
					},
				],
			}),
		);

		await queryRunner.createForeignKey(
			TABLE,
			new TableForeignKey({
				name: 'fk_workflow_seeded_step_execution',
				columnNames: ['execution_id'],
				referencedTableName: 'workflow_execution',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable(TABLE);
	}
}
