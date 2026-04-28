// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { QueryFailedError } from '@n8n/typeorm';

const UNIQUE_VIOLATION_CODES = new Set([
	'23505', // Postgres
	'SQLITE_CONSTRAINT_UNIQUE', // SQLite with extended result codes enabled
]);

export function isUniqueViolationError(error: unknown): error is QueryFailedError {
	if (!(error instanceof QueryFailedError)) return false;
	const code = (error.driverError as { code?: unknown })?.code;
	if (typeof code !== 'string') return false;
	if (UNIQUE_VIOLATION_CODES.has(code)) return true;
	// SQLite without extended result codes reports the base 'SQLITE_CONSTRAINT' and
	// carries the specific violation type in the error message.
	if (code === 'SQLITE_CONSTRAINT') {
		return error.message.includes('UNIQUE constraint failed');
	}
	return false;
}
