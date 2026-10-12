import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Usage counting: `usage_event` is a high-churn queue (one insert per run phase, deleted by
 * the fold), `usage_ledger` keeps one deduplicated row per execution and phase, and
 * `usage_by_period` counts runs per project, raw dimensions and UTC period. Units are applied
 * when reading, so no table holds a billing rule.
 */
export class CreateUsageTables1791400000000 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const event = escape.tableName('usage_event');
		const ledger = escape.tableName('usage_ledger');
		const period = escape.tableName('usage_by_period');
		const c = (name: string) => escape.columnName(name);

		const timestamp = isPostgres ? 'TIMESTAMP(3) WITH TIME ZONE' : 'DATETIME(3)';
		const now = isPostgres ? 'CURRENT_TIMESTAMP' : "(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))";

		const factColumns = `
			${c('kind')} VARCHAR(16) NOT NULL,
			${c('executionId')} VARCHAR(36) NOT NULL,
			${c('phase')} VARCHAR(16) NOT NULL,
			${c('subjectId')} VARCHAR(36) NOT NULL,
			${c('subjectName')} VARCHAR(128),
			${c('projectId')} VARCHAR(36),
			${c('trigger')} VARCHAR(32) NOT NULL,
			${c('status')} VARCHAR(16) NOT NULL,
			${c('origin')} VARCHAR(32),
			${c('isTest')} BOOLEAN NOT NULL,
			${c('parentId')} VARCHAR(128),
			${c('startedAt')} ${timestamp},
			${c('occurredAt')} ${timestamp} NOT NULL`;

		// No secondary index on the queue, so the hot-path insert stays cheap.
		if (isPostgres) {
			await runQuery(
				`CREATE TABLE ${event} (
					${c('id')} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
					${factColumns}
				) WITH (
					autovacuum_vacuum_scale_factor = 0.0,
					autovacuum_vacuum_threshold = 1000,
					autovacuum_vacuum_cost_delay = 0
				)`,
			);
		} else {
			await runQuery(
				`CREATE TABLE ${event} (
					${c('id')} INTEGER PRIMARY KEY AUTOINCREMENT,
					${factColumns}
				)`,
			);
		}

		await runQuery(
			`CREATE TABLE ${ledger} (
				${factColumns},
				${c('foldedAt')} ${timestamp} NOT NULL DEFAULT ${now},
				PRIMARY KEY (${c('kind')}, ${c('executionId')}, ${c('phase')})
			)`,
		);
		await runQuery(
			`CREATE INDEX ${escape.indexName('usage_ledger_occurred_at')} ON ${ledger} (${c('occurredAt')})`,
		);

		await runQuery(
			`CREATE TABLE ${period} (
				${c('projectId')} VARCHAR(36) NOT NULL,
				${c('kind')} VARCHAR(16) NOT NULL,
				${c('subjectId')} VARCHAR(36) NOT NULL,
				${c('phase')} VARCHAR(16) NOT NULL,
				${c('trigger')} VARCHAR(32) NOT NULL,
				${c('status')} VARCHAR(16) NOT NULL,
				${c('origin')} VARCHAR(32) NOT NULL,
				${c('isTest')} BOOLEAN NOT NULL,
				${c('hasParent')} BOOLEAN NOT NULL,
				${c('periodUnit')} VARCHAR(8) NOT NULL,
				${c('periodStart')} ${timestamp} NOT NULL,
				${c('count')} BIGINT NOT NULL,
				PRIMARY KEY (${c('projectId')}, ${c('kind')}, ${c('subjectId')}, ${c('phase')}, ${c('trigger')}, ${c('status')}, ${c('origin')}, ${c('isTest')}, ${c('hasParent')}, ${c('periodUnit')}, ${c('periodStart')})
			)`,
		);
		// The limit read: one project's facts of one kind and phase over a period, filtered by a unit.
		await runQuery(
			`CREATE INDEX ${escape.indexName('usage_by_period_project_kind')} ON ${period} (${c('projectId')}, ${c('kind')}, ${c('phase')}, ${c('periodStart')})`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP TABLE ${escape.tableName('usage_by_period')}`);
		await runQuery(`DROP TABLE ${escape.tableName('usage_ledger')}`);
		await runQuery(`DROP TABLE ${escape.tableName('usage_event')}`);
	}
}
