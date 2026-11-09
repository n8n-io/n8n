import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddGuardrailStopToAgentExecution1792597769231 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const agentExecution = escape.tableName('agent_execution');
		const finishReason = escape.columnName('finishReason');
		const guardrailCode = escape.columnName('guardrailCode');

		// Plain ALTER keeps SQLite from recreating a potentially large table.
		await runQuery(`ALTER TABLE ${agentExecution} ADD COLUMN ${finishReason} VARCHAR(32)`);
		await runQuery(`ALTER TABLE ${agentExecution} ADD COLUMN ${guardrailCode} VARCHAR(64)`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${agentExecution}.${finishReason} IS 'Why the run ended, e.g. stop or guardrail. Null for older runs.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${agentExecution}.${guardrailCode} IS 'Code of the guardrail that stopped the run, e.g. budget.session.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const agentExecution = escape.tableName('agent_execution');

		await runQuery(
			`ALTER TABLE ${agentExecution} DROP COLUMN ${escape.columnName('guardrailCode')}`,
		);
		await runQuery(
			`ALTER TABLE ${agentExecution} DROP COLUMN ${escape.columnName('finishReason')}`,
		);
	}
}
