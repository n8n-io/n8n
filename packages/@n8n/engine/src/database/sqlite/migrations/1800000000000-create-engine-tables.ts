import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';

/**
 * The engine's three tables, for SQLite. One migration, because SQLite has no
 * history to carry: the Postgres migrations are the schema's record, and this
 * is their sum.
 *
 * JSON columns are `text`: a column declared `json` gets numeric affinity in
 * SQLite, which would turn the string `"1"` into the number 1. Timestamps are
 * `datetime` holding `YYYY-MM-DD HH:MM:SS.SSS` UTC strings, which is what the
 * SQLite driver writes for a `Date` and what `CURRENT_TIMESTAMP` compares
 * against correctly.
 */
export class CreateEngineTables1800000000000 implements MigrationInterface {
	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE workflow_execution (
				id varchar PRIMARY KEY NOT NULL,
				workflow_id varchar NOT NULL,
				status varchar(32) NOT NULL,
				mode varchar(32) NOT NULL,
				graph text NOT NULL,
				workflow text NOT NULL,
				trigger_outputs text,
				caller_context text NOT NULL,
				response_expectation text NOT NULL,
				parent_execution_id varchar,
				parent_step_id varchar,
				parent_awaited boolean,
				lifecycle_event_subscription text,
				stale_after datetime,
				created_at datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
				updated_at datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
				finished_at datetime,
				CONSTRAINT chk_workflow_execution_status CHECK (
					status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'cancelled')
				),
				CONSTRAINT chk_workflow_execution_parent CHECK (
					(parent_execution_id IS NULL AND parent_step_id IS NULL AND parent_awaited IS NULL)
					OR (parent_execution_id IS NOT NULL AND parent_step_id IS NOT NULL AND parent_awaited IS NOT NULL)
				)
			)
		`);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_workflow_id_created_at_id ON workflow_execution (workflow_id, created_at, id)',
		);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_created_at_id ON workflow_execution (created_at, id)',
		);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_status ON workflow_execution (status)',
		);
		await queryRunner.query(
			'CREATE INDEX idx_workflow_execution_parent_execution_id ON workflow_execution (parent_execution_id) WHERE parent_execution_id IS NOT NULL',
		);
		await queryRunner.query(
			"CREATE INDEX idx_workflow_execution_stale_after ON workflow_execution (stale_after) WHERE status = 'queued'",
		);

		await queryRunner.query(`
			CREATE TABLE workflow_step_execution (
				id varchar PRIMARY KEY NOT NULL,
				execution_id varchar NOT NULL REFERENCES workflow_execution (id) ON DELETE CASCADE,
				node_id varchar NOT NULL,
				iteration integer NOT NULL DEFAULT 0,
				status varchar(32) NOT NULL,
				outputs text,
				error text,
				wait_declaration text,
				wait_till datetime,
				resume_cause text,
				stale_after datetime,
				created_at datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
				updated_at datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
				CONSTRAINT chk_workflow_step_execution_status CHECK (
					status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'skipped', 'cancelled')
				)
			)
		`);
		await queryRunner.query(
			'CREATE UNIQUE INDEX uniq_workflow_step_execution_execution_id_node_id_iteration ON workflow_step_execution (execution_id, node_id, iteration)',
		);
		await queryRunner.query(
			"CREATE INDEX idx_workflow_step_execution_failed ON workflow_step_execution (execution_id) WHERE status = 'failed'",
		);
		await queryRunner.query(
			"CREATE INDEX idx_workflow_step_execution_wait_till ON workflow_step_execution (wait_till) WHERE status = 'waiting'",
		);
		await queryRunner.query(
			"CREATE INDEX idx_workflow_step_execution_unsettled ON workflow_step_execution (execution_id, status) WHERE status IN ('queued', 'running', 'waiting')",
		);
		await queryRunner.query(
			"CREATE INDEX idx_workflow_step_execution_stale_after ON workflow_step_execution (status, stale_after) WHERE status IN ('queued', 'running')",
		);

		await queryRunner.query(`
			CREATE TABLE workflow_seeded_step (
				execution_id varchar NOT NULL REFERENCES workflow_execution (id) ON DELETE CASCADE,
				node_id varchar NOT NULL,
				iteration integer NOT NULL,
				outputs text NOT NULL,
				PRIMARY KEY (execution_id, node_id, iteration)
			)
		`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE workflow_seeded_step');
		await queryRunner.query('DROP TABLE workflow_step_execution');
		await queryRunner.query('DROP TABLE workflow_execution');
	}
}
