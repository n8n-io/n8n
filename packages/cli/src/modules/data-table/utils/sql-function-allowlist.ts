import type { DataSourceOptions } from '@n8n/typeorm';

const COMMON_FUNCTIONS = [
	'COUNT',
	'SUM',
	'AVG',
	'MIN',
	'MAX',
	'LOWER',
	'UPPER',
	'TRIM',
	'LENGTH',
	'SUBSTR',
	'REPLACE',
	'ABS',
	'ROUND',
	'COALESCE',
	'NULLIF',
	'CAST',
] as const;

const SQLITE_SPECIFIC_FUNCTIONS = [
	'GROUP_CONCAT',
	'STRFTIME',
	'IFNULL',
	'IIF',
	'TYPEOF',
	'DATE',
	'DATETIME',
	'CURRENT_TIMESTAMP',
	'CURRENT_DATE',
] as const;

const POSTGRES_SPECIFIC_FUNCTIONS = [
	'STRING_AGG',
	'EXTRACT',
	'DATE_TRUNC',
	'TO_CHAR',
	'TO_DATE',
	'CONCAT',
	'CEIL',
	'FLOOR',
	'NOW',
	'CURRENT_TIMESTAMP',
	'CURRENT_DATE',
] as const;

const SQLITE_ALLOWED_FUNCTIONS: string[] = [...COMMON_FUNCTIONS, ...SQLITE_SPECIFIC_FUNCTIONS];

const POSTGRES_ALLOWED_FUNCTIONS: string[] = [...COMMON_FUNCTIONS, ...POSTGRES_SPECIFIC_FUNCTIONS];

/**
 * Returns the list of allowed SQL functions for the given database type.
 */
export function getAllowedFunctions(dbType: DataSourceOptions['type']): string[] {
	if (dbType === 'sqlite' || dbType === 'sqlite-pooled') {
		return SQLITE_ALLOWED_FUNCTIONS;
	}

	return POSTGRES_ALLOWED_FUNCTIONS;
}

/**
 * Returns true if the given function name is in the allowlist for the given database type.
 * The check is case-insensitive.
 */
export function isAllowedFunction(name: string, dbType: DataSourceOptions['type']): boolean {
	const allowed = getAllowedFunctions(dbType);
	return allowed.includes(name.toUpperCase());
}
