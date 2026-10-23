import { QueryFailedError } from '@n8n/typeorm';

/**
 * Whether `error` is a `QueryFailedError` violating the constraint kind identified
 * by `postgresCode`/`sqliteExtendedCode`/`sqliteMessagePattern`, across PostgreSQL
 * and SQLite. Shared by the per-kind predicates (`isUniqueConstraintError`,
 * `isForeignKeyConstraintError`, …) so the driver-error narrowing and SQLite
 * disambiguation logic have one implementation instead of drifting copies.
 */
export function isQueryFailedErrorOfKind(
	error: unknown,
	{
		postgresCode,
		sqliteExtendedCode,
		sqliteMessagePattern,
	}: { postgresCode: string; sqliteExtendedCode: string; sqliteMessagePattern: RegExp },
): boolean {
	if (!(error instanceof QueryFailedError)) return false;

	// TypeORM types `driverError` as `any`; narrow it via `unknown` so the
	// property checks below stay type-safe without an `as` cast.
	const driverError: unknown = error.driverError;
	if (typeof driverError !== 'object' || driverError === null) return false;

	const code =
		'code' in driverError && typeof driverError.code === 'string' ? driverError.code : undefined;

	if (code === postgresCode) return true;

	// SQLite: the extended code is unambiguous; the base code covers all constraint
	// kinds (NOT NULL, FK, CHECK, UNIQUE), so disambiguate via the message.
	if (code === sqliteExtendedCode) return true;
	return code === 'SQLITE_CONSTRAINT' && sqliteMessagePattern.test(error.message);
}
