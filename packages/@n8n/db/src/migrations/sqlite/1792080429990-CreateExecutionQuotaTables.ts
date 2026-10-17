import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Create `execution_quota` (admin-set limits) and `execution_quota_usage` (folded daily totals).
 * Usage rows have no FK on purpose: like `workflow_statistics`, they are a hot aggregate.
 */
export class CreateExecutionQuotaTables1792080429990 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const quota = escape.tableName('execution_quota');
		const usage = escape.tableName('execution_quota_usage');

		await runQuery(
			`CREATE TABLE ${quota} (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"workflowId" varchar(36) REFERENCES ${escape.tableName('workflow_entity')} ("id") ON DELETE CASCADE,
				"projectId" varchar(36) REFERENCES ${escape.tableName('project')} ("id") ON DELETE CASCADE,
				"period" varchar(8) NOT NULL CHECK ("period" IN ('day', 'month')),
				"limit" integer NOT NULL CHECK ("limit" >= 0),
				"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				CHECK (("workflowId" IS NULL) <> ("projectId" IS NULL))
			)`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX ${escape.indexName('execution_quota_workflow')}
			ON ${quota} ("workflowId") WHERE "workflowId" IS NOT NULL`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX ${escape.indexName('execution_quota_project')}
			ON ${quota} ("projectId") WHERE "projectId" IS NOT NULL`,
		);

		await runQuery(
			`CREATE TABLE ${usage} (
				"scopeType" varchar(16) NOT NULL CHECK ("scopeType" IN ('workflow', 'project')),
				"scopeId" varchar(36) NOT NULL,
				"day" date NOT NULL,
				"used" bigint NOT NULL,
				PRIMARY KEY ("scopeType", "scopeId", "day")
			)`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP TABLE ${escape.tableName('execution_quota_usage')}`);
		await runQuery(`DROP TABLE ${escape.tableName('execution_quota')}`);
	}
}
