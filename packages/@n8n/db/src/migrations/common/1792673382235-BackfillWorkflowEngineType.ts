import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** Postgres function that this migration creates, uses, and drops again. */
const toJsonbOrNullName = 'workflow_engine_backfill_to_jsonb';

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
 * On Postgres the column is `json` and the update goes through `jsonb`. A `json`
 * value can hold content that `jsonb` rejects, such as an escaped NUL character
 * (`\u0000`), an unpaired surrogate escape, or a number out of `numeric` range.
 * A temporary function converts each value and returns `NULL` when `jsonb` rejects
 * it. `up()` and `down()` skip these objects, and `up()` counts them with the other
 * skipped rows. Their engine stays unset, which runs as `v1`.
 */
export class BackfillWorkflowEngineType1792673382235 implements ReversibleMigration {
	async up(context: MigrationContext) {
		if (context.isPostgres) await this.createToJsonbOrNull(context);
		await this.logSkippedRows(context);
		await this.setEngineOnObjects(context);
		await this.setEngineOnNulls(context);
		if (context.isPostgres) await this.dropToJsonbOrNull(context);
	}

	async down(context: MigrationContext) {
		const { escape, isPostgres, runQuery } = context;
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');
		const toJsonbOrNull = escape.functionName(toJsonbOrNullName);

		if (isPostgres) {
			await this.createToJsonbOrNull(context);
			await runQuery(
				`UPDATE ${table} SET ${settings} = (${toJsonbOrNull}(${settings}) - 'engineType')::json
					WHERE json_typeof(${settings}) = 'object'
						AND ${toJsonbOrNull}(${settings}) ->> 'engineType' = 'v1'`,
			);
			await this.dropToJsonbOrNull(context);
			return;
		}

		await runQuery(
			`UPDATE ${table} SET ${settings} = json_remove(${settings}, '$.engineType')
				WHERE CASE WHEN json_valid(${settings}) THEN
					json_type(${settings}) = 'object' AND json_extract(${settings}, '$.engineType') = 'v1'
				END`,
		);
	}

	/**
	 * Creates a Postgres function that converts `json` to `jsonb`, or returns `NULL`
	 * when `jsonb` rejects the value. A plain cast stops the migration on the first
	 * such row. Every error that the conversion raises is in the `data_exception` class.
	 */
	private async createToJsonbOrNull({ escape, runQuery }: MigrationContext) {
		const toJsonbOrNull = escape.functionName(toJsonbOrNullName);

		await runQuery(`
			CREATE OR REPLACE FUNCTION ${toJsonbOrNull}(value json)
			RETURNS jsonb
			LANGUAGE plpgsql
			AS $$
			BEGIN
				RETURN value::jsonb;
			EXCEPTION WHEN data_exception THEN
				RETURN NULL;
			END;
			$$
		`);
	}

	private async dropToJsonbOrNull({ escape, runQuery }: MigrationContext) {
		const toJsonbOrNull = escape.functionName(toJsonbOrNullName);

		await runQuery(`DROP FUNCTION IF EXISTS ${toJsonbOrNull}(json)`);
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
		const toJsonbOrNull = escape.functionName(toJsonbOrNullName);

		const [{ count }] = await runQuery<Array<{ count: number | string }>>(
			isPostgres
				? `SELECT COUNT(*) AS count FROM ${table}
					WHERE json_typeof(${settings}) NOT IN ('object', 'null')
						OR (json_typeof(${settings}) = 'object' AND ${toJsonbOrNull}(${settings}) IS NULL)`
				: `SELECT COUNT(*) AS count FROM ${table}
					WHERE ${settings} IS NOT NULL
						AND COALESCE(CASE WHEN json_valid(${settings}) THEN json_type(${settings}) END, 'invalid')
							NOT IN ('object', 'null')`,
		);

		if (Number(count) > 0) {
			logger.warn(
				`[${migrationName}] Skipped ${count} workflows whose settings are not a JSON object, or that Postgres can't convert to jsonb`,
			);
		}
	}

	private async setEngineOnObjects({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName('workflow_entity');
		const settings = escape.columnName('settings');
		const toJsonbOrNull = escape.functionName(toJsonbOrNullName);

		// Postgres: a `NULL` from the function makes the `WHERE` false, so the row is skipped.
		// SQLite does not promise the order of `AND` terms, and its JSON functions fail on
		// invalid JSON, so every JSON call sits behind `json_valid`.
		await runQuery(
			isPostgres
				? `UPDATE ${table} SET ${settings} = jsonb_set(${toJsonbOrNull}(${settings}), '{engineType}', '"v1"')::json
					WHERE json_typeof(${settings}) = 'object' AND NOT (${toJsonbOrNull}(${settings}) ? 'engineType')`
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
