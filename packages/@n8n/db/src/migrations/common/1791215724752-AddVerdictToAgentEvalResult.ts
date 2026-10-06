import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'agent_eval_result';
const COLUMN = 'verdict';

/**
 * Adds a nullable `verdict` JSON column to `agent_eval_result`, mirroring the
 * existing `toolCalls`/`metrics` columns. `null` means "never judged" — every
 * row before this ships, plus any row whose case has no rule/gold answer to
 * grade against.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: the table has
 * an incoming FK from `agent_eval_rating`, and the DSL recreates the table on
 * SQLite, which would fire that FK's CASCADE.
 */
export class AddVerdictToAgentEvalResult1791215724752 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName(TABLE);
		const columnName = escape.columnName(COLUMN);

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} JSON`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName(TABLE);
		const columnName = escape.columnName(COLUMN);

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
