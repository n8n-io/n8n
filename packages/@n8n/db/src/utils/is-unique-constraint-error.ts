import { isQueryFailedErrorOfKind } from './is-query-failed-error-of-kind';

/**
 * Whether `error` is a unique-constraint violation, across PostgreSQL and SQLite.
 */
export function isUniqueConstraintError(error: unknown): boolean {
	return isQueryFailedErrorOfKind(error, {
		// PostgreSQL: 23505 = unique_violation.
		postgresCode: '23505',
		sqliteExtendedCode: 'SQLITE_CONSTRAINT_UNIQUE',
		sqliteMessagePattern: /UNIQUE constraint/i,
	});
}
