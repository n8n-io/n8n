import { UnexpectedError } from 'n8n-workflow';

export type DialectQuery = { sql: string; params: unknown[] };

/**
 * Rewrites Postgres `$n` placeholders to SQLite `?`, in order of appearance. A repeated `$n`
 * repeats its parameter. The SQL must not contain `$n` inside a string literal.
 */
export function toSqlitePlaceholders(sql: string, params: readonly unknown[]): DialectQuery {
	const ordered: unknown[] = [];
	const rewritten = sql.replace(/\$(\d+)/g, (_match, index: string) => {
		const position = Number(index) - 1;
		if (position < 0 || position >= params.length) {
			throw new UnexpectedError(`Placeholder $${index} has no parameter`, {
				extra: { parameterCount: params.length },
			});
		}
		ordered.push(params[position]);
		return '?';
	});
	return { sql: rewritten, params: ordered };
}

/** Lets a raw query be written once with `$n` placeholders for both dialects. */
export function toDialectQuery(
	isPostgres: boolean,
	sql: string,
	params: readonly unknown[],
): DialectQuery {
	return isPostgres ? { sql, params: [...params] } : toSqlitePlaceholders(sql, params);
}
