import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Postgres regex for the escapes that `jsonb` rejects: an escaped NUL (`\u0000`) and a
 * surrogate escape (`\ud800` to `\udfff`). The SQL gets `\\u`: a backslash, then `u`.
 */
const jsonbRejectedEscape = "'\\\\u(0000|d[89a-f])'";

/**
 * Sets `engineType: 'v1'` on every workflow whose settings have no engine, so that
 * every workflow names its engine explicitly. A workflow that already has an engine
 * keeps it. Settings that are SQL `NULL` or JSON `null` become `{"engineType":"v1"}`.
 * Settings that are not a JSON object (an array, a scalar, invalid JSON) stay as
 * they are, and the migration logs how many it skipped.
 *
 * `down()` removes `engineType` where it is `v1`, including values that existed
 * before this migration, and leaves `{}` where settings were `NULL`. That is not an
 * exact undo, but it changes no behaviour: an unset engine and `v1` run the same.
 *
 * On Postgres the column is `json` and the update goes through `jsonb`, which
 * rejects the escaped NUL character (`\u0000`) and surrogate escapes (such as
 * `\ud83d`). `up()` and `down()` skip a settings object that holds one, and `up()`
 * counts it with the other skipped rows. Its engine stays unset, which runs as `v1`.
 */
export class BackfillWorkflowEngineType1792673382235 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.logSkippedRows(context);
		await this.setEngineOnObjects(context);
		await this.setEngineOnNulls(context);
	}

	async down({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');

		await runQuery(
			isPostgres
				? `UPDATE ${table} SET ${settings} = (${settings}::jsonb - 'engineType')::json
					WHERE CASE WHEN json_typeof(${settings}) = 'object'
						AND ${settings}::text !~* ${jsonbRejectedEscape} THEN
						${settings}::jsonb ->> 'engineType' = 'v1'
					END`
				: `UPDATE ${table} SET ${settings} = json_remove(${settings}, '$.engineType')
					WHERE CASE WHEN json_valid(${settings}) THEN
						json_type(${settings}) = 'object' AND json_extract(${settings}, '$.engineType') = 'v1'
					END`,
		);
	}

	private async logSkippedRows({
		escape,
		isPostgres,
		runQuery,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');

		const [{ count }] = await runQuery<Array<{ count: number | string }>>(
			isPostgres
				? `SELECT COUNT(*) AS count FROM ${table}
					WHERE json_typeof(${settings}) NOT IN ('object', 'null')
						OR (json_typeof(${settings}) = 'object' AND ${settings}::text ~* ${jsonbRejectedEscape})`
				: `SELECT COUNT(*) AS count FROM ${table}
					WHERE ${settings} IS NOT NULL
						AND COALESCE(CASE WHEN json_valid(${settings}) THEN json_type(${settings}) END, 'invalid')
							NOT IN ('object', 'null')`,
		);

		if (Number(count) > 0) {
			logger.warn(
				`[${migrationName}] Skipped ${count} workflows whose settings are not a JSON object, or hold an escape that jsonb rejects`,
			);
		}
	}

	private async setEngineOnObjects({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');

		// Neither database promises the order of `AND` terms, so every cast or JSON call
		// that can fail sits behind a `CASE`: `jsonb` on Postgres, `json_valid` on SQLite.
		await runQuery(
			isPostgres
				? `UPDATE ${table} SET ${settings} = jsonb_set(${settings}::jsonb, '{engineType}', '"v1"')::json
					WHERE CASE WHEN json_typeof(${settings}) = 'object'
						AND ${settings}::text !~* ${jsonbRejectedEscape} THEN
						NOT (${settings}::jsonb ? 'engineType')
					END`
				: `UPDATE ${table} SET ${settings} = json_set(${settings}, '$.engineType', 'v1')
					WHERE CASE WHEN json_valid(${settings}) THEN
						json_type(${settings}) = 'object' AND json_type(${settings}, '$.engineType') IS NULL
					END`,
		);
	}

	private async setEngineOnNulls({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');

		await runQuery(
			isPostgres
				? `UPDATE ${table} SET ${settings} = '{"engineType":"v1"}'
					WHERE ${settings} IS NULL OR json_typeof(${settings}) = 'null'`
				: `UPDATE ${table} SET ${settings} = '{"engineType":"v1"}'
					WHERE ${settings} IS NULL
						OR CASE WHEN json_valid(${settings}) THEN json_type(${settings}) = 'null' END`,
		);
	}
}
