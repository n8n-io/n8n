import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

export class CreateWorkflowExecution1778529600000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE workflow_execution (
				id varchar PRIMARY KEY,
				workflow_id varchar NOT NULL,
				status varchar(32) NOT NULL,
				mode varchar(32) NOT NULL,
				graph jsonb NOT NULL,
				trigger_payload jsonb,
				created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
				updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
				finished_at timestamptz(3)
			)
		`);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_workflow_id ON workflow_execution (workflow_id)',
		);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_status ON workflow_execution (status)',
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE workflow_execution');
	}
}
