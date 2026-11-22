// With DB_POSTGRESDB_SESSION_SETTINGS_MODE=per-connection, n8n sends `search_path` and
// `statement_timeout` only on the first checkout of each pooled connection. Behind a
// transaction-mode pooler, later queries can run on a server connection that never got
// them. Role defaults apply to every server connection, so they close that gap.

export type SessionSettings = {
	database: string;
	schema: string;
	statementTimeoutMs: number;
};

/** What a new session starts with, as Postgres reports it. */
export type RoleDefaults = {
	/** `current_schema()` under the role's default `search_path`: where unqualified names resolve. */
	schema: string | null;
	/** `reset_val` of `statement_timeout`, in milliseconds. */
	statementTimeout: string | null;
};

function quoteIdentifier(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
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

	// n8n sends a search_path for `public` too, so this applies to every schema.
	const schema = settings.schema || 'public';
	if (defaults.schema !== schema) {
		statements.push(
			schema === 'public'
				? `${alterRole} SET search_path = public;`
				: `${alterRole} SET search_path = ${quoteIdentifier(schema)}, public;`,
		);
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
		'DB_POSTGRESDB_SESSION_SETTINGS_MODE is set to "per-connection", but the database role defaults do not match the configured session settings.',
		'This is safe on a direct connection to Postgres.',
		'Behind a pooler in transaction mode, such as PgBouncer, queries can fail with "relation does not exist" or run without a timeout.',
		`To fix this, connect as the n8n database user, run ${statements.join(' ')} Then reconnect the pooler.`,
	].join(' ');
}
