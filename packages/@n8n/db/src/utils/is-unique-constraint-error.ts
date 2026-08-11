import { QueryFailedError } from '@n8n/typeorm';

/**
 * Whether `error` is a unique-constraint violation, across PostgreSQL and SQLite.
 */
export function isUniqueConstraintError(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;

	// TypeORM types `driverError` as `any`; narrow it via `unknown` so the
	// property checks below stay type-safe without an `as` cast.
	const driverError: unknown = error.driverError;
	if (typeof driverError !== 'object' || driverError === null) return false;

	const code =
		'code' in driverError && typeof driverError.code === 'string' ? driverError.code : undefined;

	// PostgreSQL: 23505 = unique_violation.
	if (code === '23505') return true;

	// SQLite: the extended code is unambiguous; the base code covers all constraint
	// kinds (NOT NULL, FK, CHECK, UNIQUE), so disambiguate via the message.
	if (code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
	if (code === 'SQLITE_CONSTRAINT' && /UNIQUE constraint/i.test(error.message)) return true;

	return false;
}
