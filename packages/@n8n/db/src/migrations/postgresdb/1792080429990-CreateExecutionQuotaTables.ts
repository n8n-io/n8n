/* eslint-disable @typescript-eslint/unbound-method */
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Create `execution_quota` (admin-set limits) and `execution_quota_usage` (folded daily totals).
 * Usage rows have no FK on purpose: like `workflow_statistics`, they are a hot aggregate.
 */
export class CreateExecutionQuotaTables1792080429990 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const quota = escape.tableName('execution_quota');
		const usage = escape.tableName('execution_quota_usage');
		const workflows = escape.tableName('workflow_entity');
		const projects = escape.tableName('project');
		const id = escape.columnName('id');
		const workflowId = escape.columnName('workflowId');
		const projectId = escape.columnName('projectId');
		const period = escape.columnName('period');
		const limit = escape.columnName('limit');
		const createdAt = escape.columnName('createdAt');
		const updatedAt = escape.columnName('updatedAt');
		const scopeType = escape.columnName('scopeType');
		const scopeId = escape.columnName('scopeId');
		const day = escape.columnName('day');
		const used = escape.columnName('used');

		await runQuery(
			`CREATE TABLE ${quota} (
				${id} INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				${workflowId} VARCHAR(36) REFERENCES ${workflows} (${id}) ON DELETE CASCADE,
				${projectId} VARCHAR(36) REFERENCES ${projects} (${id}) ON DELETE CASCADE,
				${period} VARCHAR(8) NOT NULL CHECK (${period} IN ('day', 'month')),
				${limit} INT NOT NULL CHECK (${limit} >= 0),
				${createdAt} TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
				${updatedAt} TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CHECK ((${workflowId} IS NULL) <> (${projectId} IS NULL))
			)`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX ${escape.indexName('execution_quota_workflow')}
			ON ${quota} (${workflowId}) WHERE ${workflowId} IS NOT NULL`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX ${escape.indexName('execution_quota_project')}
			ON ${quota} (${projectId}) WHERE ${projectId} IS NOT NULL`,
		);

		await runQuery(
			`CREATE TABLE ${usage} (
				${scopeType} VARCHAR(16) NOT NULL CHECK (${scopeType} IN ('workflow', 'project')),
				${scopeId} VARCHAR(36) NOT NULL,
				${day} DATE NOT NULL,
				${used} BIGINT NOT NULL,
				PRIMARY KEY (${scopeType}, ${scopeId}, ${day})
			)`,
		);
		await runQuery(`COMMENT ON COLUMN ${usage}.${day} IS 'UTC day the executions started on'`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP TABLE ${escape.tableName('execution_quota_usage')}`);
		await runQuery(`DROP TABLE ${escape.tableName('execution_quota')}`);
	}
}
