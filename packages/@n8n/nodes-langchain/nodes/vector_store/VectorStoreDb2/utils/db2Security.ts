/**
 * Security validation and sanitization utilities for IBM DB2 operations
 * Ported from db2_security.py
 */

import type { ValidationResult } from './types';

// Regex patterns for validation
const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,127}$/;
const HOSTNAME_PATTERN = /^[A-Za-z0-9.-]{1,253}$/;

// Constants
const MAX_DB_NAME_LENGTH = 128;
const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Require a non-empty string value
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Trimmed string value
 * @throws Error if value is not a string or is empty
 */
function requireString(value: unknown, fieldName: string): string {
	if (typeof value !== 'string') {
		throw new TypeError(`Invalid ${fieldName}: must be a string`);
	}

	const cleaned = value.trim();
	if (!cleaned) {
		throw new Error(`Invalid ${fieldName}: cannot be empty`);
	}

	return cleaned;
}

/**
 * Validate a DB2 database name
 * @param value - Database name to validate
 * @returns Validated database name
 * @throws Error if validation fails
 */
export function validateDatabaseName(value: unknown): string {
	const databaseName = requireString(value, 'database name');

	if (databaseName.length > MAX_DB_NAME_LENGTH) {
		throw new Error('Invalid database name: exceeds maximum length');
	}

	const unsafeChars = ['"', "'", ';', '\\', '\n', '\r', '\t'];
	if (unsafeChars.some((char) => databaseName.includes(char))) {
		throw new Error('Invalid database name: contains unsafe characters');
	}

	return databaseName;
}

/**
 * Validate a hostname or IP address
 * @param value - Hostname to validate
 * @returns Validated hostname
 * @throws Error if validation fails
 */
export function validateHostname(value: unknown): string {
	const hostname = requireString(value, 'hostname');

	const unsafeChars = ['"', "'", ';', '\\', '/', '?', '#', '\n', '\r', '\t', ' '];
	if (unsafeChars.some((char) => hostname.includes(char))) {
		throw new Error('Invalid hostname: contains unsafe characters');
	}

	if (!HOSTNAME_PATTERN.test(hostname)) {
		throw new Error('Invalid hostname: contains unsupported characters');
	}

	if (
		hostname.includes('..') ||
		hostname.startsWith('.') ||
		hostname.startsWith('-') ||
		hostname.endsWith('.')
	) {
		throw new Error('Invalid hostname: malformed hostname');
	}

	return hostname;
}

/**
 * Validate a TCP port number
 * @param value - Port number to validate
 * @returns Validated port number
 * @throws Error if validation fails
 */
export function validatePort(value: unknown): number {
	if (typeof value === 'boolean' || typeof value !== 'number') {
		throw new TypeError('Invalid port: must be a number');
	}

	if (!Number.isInteger(value)) {
		throw new TypeError('Invalid port: must be an integer');
	}

	if (value < MIN_PORT || value > MAX_PORT) {
		throw new Error(`Invalid port: must be between ${MIN_PORT} and ${MAX_PORT}`);
	}

	return value;
}

/**
 * Validate a SQL identifier (table name, column name, etc.)
 * @param value - Identifier to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validated identifier
 * @throws Error if validation fails
 */
export function validateIdentifier(value: unknown, fieldName: string = 'identifier'): string {
	const identifier = requireString(value, fieldName);

	if (!IDENTIFIER_PATTERN.test(identifier)) {
		throw new Error(
			`Invalid ${fieldName}: use letters, numbers, and underscores only, starting with a letter`,
		);
	}

	return identifier;
}

/**
 * Get a properly quoted SQL identifier for DB2
 * @param identifier - The identifier to quote (should already be validated)
 * @returns The quoted identifier safe for SQL queries
 */
export function getQuotedIdentifier(identifier: string): string {
	// DB2 uses double quotes for identifiers
	// Escape any existing double quotes by doubling them
	const escaped = identifier.replace(/"/g, '""');
	return `"${escaped}"`;
}

/**
 * Sanitize a string value for use in SQL queries
 * @param value - The string value to sanitize
 * @returns The sanitized string with dangerous characters escaped
 */
export function sanitizeSqlString(value: string): string {
	// Escape single quotes by doubling them (SQL standard)
	return value.replace(/'/g, "''");
}

/**
 * Create a sanitized error message without exposing connection details
 * @param error - The error object
 * @param context - Optional context for the error
 * @returns Sanitized error message
 */
export function createSafeErrorMessage(error: Error, context?: string): string {
	const errorText = error.message?.trim() || 'Unknown error';
	let redactedText = errorText;

	// Patterns to redact sensitive information
	const sensitivePatterns = [
		/PWD=[^; ]+/gi,
		/PASSWORD=[^; ]+/gi,
		/UID=[^; ]+/gi,
		/USER(ID)?=[^; ]+/gi,
		/HOSTNAME=[^; ]+/gi,
		/DATABASE=[^; ]+/gi,
		/PORT=[^; ]+/gi,
	];

	for (const pattern of sensitivePatterns) {
		redactedText = redactedText.replace(pattern, '[REDACTED]');
	}

	let prefix = 'DB2 operation failed';
	if (context) {
		prefix = `${prefix} ${context}`;
	}

	return `${prefix}: ${redactedText}`;
}

/**
 * Validate all connection parameters at once
 * @param config - Connection configuration object
 * @returns Validation result
 */
export function validateConnectionConfig(config: {
	hostname: unknown;
	port: unknown;
	database: unknown;
	username: unknown;
	password: unknown;
}): ValidationResult {
	try {
		validateHostname(config.hostname);
		validatePort(config.port);
		validateDatabaseName(config.database);
		requireString(config.username, 'username');
		requireString(config.password, 'password');

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Validation failed',
		};
	}
}

/**
 * Validate table name
 * @param tableName - Table name to validate
 * @returns Validation result
 */
export function validateTableName(tableName: unknown): ValidationResult {
	try {
		validateIdentifier(tableName, 'table name');
		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid table name',
		};
	}
}

// Made with Bob
