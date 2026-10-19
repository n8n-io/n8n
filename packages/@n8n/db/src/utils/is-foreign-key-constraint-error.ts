import { isQueryFailedErrorOfKind } from './is-query-failed-error-of-kind';

/**
 * Whether `error` is a foreign-key-constraint violation, across PostgreSQL and SQLite.
 */
export function isForeignKeyConstraintError(error: unknown): boolean {
	return isQueryFailedErrorOfKind(error, {
		// PostgreSQL: 23503 = foreign_key_violation.
		postgresCode: '23503',
		sqliteExtendedCode: 'SQLITE_CONSTRAINT_FOREIGNKEY',
		sqliteMessagePattern: /FOREIGN KEY constraint/i,
	});
}
