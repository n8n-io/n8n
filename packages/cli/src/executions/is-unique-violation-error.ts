// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { QueryFailedError } from '@n8n/typeorm';

const UNIQUE_VIOLATION_CODES = new Set([
	'23505', // Postgres
	'SQLITE_CONSTRAINT_UNIQUE', // SQLite
]);

export function isUniqueViolationError(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;
	const code = (error.driverError as { code?: unknown })?.code;
	return typeof code === 'string' && UNIQUE_VIOLATION_CODES.has(code);
}
