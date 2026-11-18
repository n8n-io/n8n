import { TableColumn } from '@n8n/typeorm';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

const TABLE = 'workflow_step_execution';
const COLUMN = 'ballot_votes';

export class AddBallotVotesToWorkflowStepExecution1794960000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			TABLE,
			new TableColumn({
				name: COLUMN,
				type: 'jsonb',
				isNullable: true,
				comment:
					'The votes of a ballot wait, by voter index: { "<voter>": { decision, votedAt } }. The first vote of a voter stays.',
			}),
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn(TABLE, COLUMN);
	}
}
