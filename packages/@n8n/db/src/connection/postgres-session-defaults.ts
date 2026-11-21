// With DB_POSTGRESDB_APPLY_SESSION_SETTINGS_ONCE, n8n sends `search_path` and
// `statement_timeout` only on the first checkout of each pooled connection. Behind a
// transaction-mode pooler, later queries can run on a server connection that never got
// them. Role defaults apply to every server connection, so they close that gap.

export type SessionSettings = {
	database: string;
	schema: string;
	statementTimeoutMs: number;
};

/** `reset_val` of each setting in `pg_settings`: the value a new session starts with. */
export type RoleDefaults = {
	searchPath: string | null;
	statementTimeout: string | null;
};

function quoteIdentifier(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

/** Splits a `search_path` value like `"my schema", public` into schema names. */
function parseSearchPath(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) =>
			entry.length > 1 && entry.startsWith('"') && entry.endsWith('"')
				? entry.slice(1, -1).replace(/""/g, '"')
				: entry,
		);
}

/**
 * The `ALTER ROLE` statements that make the role defaults match what n8n sends on each
 * connection. Empty when the defaults already match.
 */
export function getMissingRoleDefaultStatements(
	settings: SessionSettings,
	defaults: RoleDefaults,
): string[] {
	const alterRole = `ALTER ROLE CURRENT_USER IN DATABASE ${quoteIdentifier(settings.database)}`;
	const statements: string[] = [];

	// For `public`, Postgres's own default (`"$user", public`) already resolves n8n's tables.
	if (settings.schema && settings.schema !== 'public') {
		const firstSchema = parseSearchPath(defaults.searchPath ?? '')[0];
		if (firstSchema !== settings.schema) {
			statements.push(
				`${alterRole} SET search_path = ${quoteIdentifier(settings.schema)}, public;`,
			);
		}
	}

	if (settings.statementTimeoutMs > 0) {
		if (Number(defaults.statementTimeout) !== settings.statementTimeoutMs) {
			statements.push(`${alterRole} SET statement_timeout = ${settings.statementTimeoutMs};`);
		}
	}

	return statements;
}

/** Warning to log when the role defaults don't match, or `null` when they do. */
export function getMissingRoleDefaultsWarning(
	settings: SessionSettings,
	defaults: RoleDefaults,
): string | null {
	const statements = getMissingRoleDefaultStatements(settings, defaults);
	if (statements.length === 0) return null;

	return [
		'DB_POSTGRESDB_APPLY_SESSION_SETTINGS_ONCE is enabled, but the database role has no matching defaults for the schema and statement timeout.',
		'This is safe on a direct connection to Postgres.',
		'Behind a pooler in transaction mode, such as PgBouncer, queries can fail with "relation does not exist" or run without a timeout.',
		`To fix this, connect as the n8n database user, run ${statements.join(' ')} Then reconnect the pooler.`,
	].join(' ');
}
