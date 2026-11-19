import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TASK_TABLE = 'task_board_task';

const columnComments = {
	severity: 'How urgent the task is. NULL = not set',
	tags: 'Array of lower-case tag strings, without duplicates',
	handoffCount: 'Agent hand-offs since a person last commented on or assigned the task',
	agentUsage:
		'Array with one item for each agent: {agentId, runs, promptTokens, completionTokens, totalTokens, cost}. cost is in USD, null = no run reported a price',
};

/**
 * Adds the triage fields (severity, tags), the hand-off counter and the token usage of
 * agent runs to a task.
 */
export class AddTriageAndUsageToTaskBoardTask1795001144195 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, tablePrefix }: MigrationContext) {
		const table = escape.tableName(TASK_TABLE);
		const severity = escape.columnName('severity');
		const jsonType = isPostgres ? 'JSON' : 'TEXT';
		// The same name that the enum check of the schema DSL has.
		const severityCheck = escape.columnName(`CHK_${tablePrefix}${TASK_TABLE}_severity`);

		// The comment table has a cascading foreign key to this table. The addColumns DSL
		// recreates the table in SQLite, so each column is added with ALTER TABLE.
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${severity} VARCHAR(16) CONSTRAINT ${severityCheck} CHECK (${severity} IN ('low', 'medium', 'high', 'critical'))`,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('tags')} ${jsonType} NOT NULL DEFAULT '[]'`,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('handoffCount')} SMALLINT NOT NULL DEFAULT 0`,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('agentUsage')} ${jsonType} NOT NULL DEFAULT '[]'`,
		);

		if (isPostgres) {
			for (const [name, comment] of Object.entries(columnComments)) {
				await runQuery(`COMMENT ON COLUMN ${table}.${escape.columnName(name)} IS '${comment}'`);
			}
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(TASK_TABLE);
		for (const name of Object.keys(columnComments).reverse()) {
			await runQuery(`ALTER TABLE ${table} DROP COLUMN ${escape.columnName(name)}`);
		}
	}
}
