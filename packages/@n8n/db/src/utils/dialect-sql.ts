import type { EntityManager } from '@n8n/typeorm';

/** Rewrites `$n` placeholders to `?`, repeating parameters where a placeholder repeats. */
export function toSqlitePlaceholders(sql: string, params: unknown[]): [string, unknown[]] {
	const ordered: unknown[] = [];
	const text = sql.replace(/\$(\d+)/g, (_, index: string) => {
		ordered.push(params[Number(index) - 1]);
		return '?';
	});
	return [text, ordered];
}

/** Runs a `$n`-style query on either dialect. */
export async function queryDialect<T>(
	manager: EntityManager,
	isSqlite: boolean,
	sql: string,
	params: unknown[] = [],
): Promise<T> {
	if (!isSqlite) return (await manager.query(sql, params)) as T;
	const [text, ordered] = toSqlitePlaceholders(sql, params);
	return (await manager.query(text, ordered)) as T;
}

/** SQLite keeps timestamps as UTC text with milliseconds, the format TypeORM writes. */
export function toSqliteTimestamp(date: Date): string {
	return date.toISOString().replace('T', ' ').replace('Z', '');
}

export function fromDbTimestamp(value: Date | string): Date {
	return value instanceof Date ? value : new Date(`${value.replace(' ', 'T')}Z`);
}

/** The UTC day of a timestamp, as `YYYY-MM-DD`. */
export function utcDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}
