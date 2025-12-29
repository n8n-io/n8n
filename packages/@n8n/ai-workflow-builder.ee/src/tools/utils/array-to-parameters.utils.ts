import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import type { ParameterEntry } from '@/schemas/parameter-entry.schema';

/**
 * Error thrown when parameter value parsing fails
 */
export class ParameterParseError extends Error {
	constructor(
		message: string,
		readonly path: string,
		readonly value: string,
		readonly type: string,
	) {
		super(message);
		this.name = 'ParameterParseError';
	}
}

/**
 * Parse a value string based on its type
 */
export function parseParameterValue(entry: ParameterEntry): unknown {
	const { type, value, path } = entry;

	switch (type) {
		case 'string':
			return value;

		case 'number': {
			const num = Number(value);
			if (Number.isNaN(num)) {
				throw new ParameterParseError(
					`Invalid number value for path "${path}": ${value}`,
					path,
					value,
					type,
				);
			}
			return num;
		}

		case 'boolean': {
			const lowerValue = value.toLowerCase();
			if (lowerValue === 'true') return true;
			if (lowerValue === 'false') return false;
			throw new ParameterParseError(
				`Invalid boolean value for path "${path}": ${value}. Expected "true" or "false"`,
				path,
				value,
				type,
			);
		}

		default:
			// Should not happen with TypeScript, but handle gracefully
			return value;
	}
}

/**
 * Check if a path segment is a numeric array index
 */
function isArrayIndex(segment: string): boolean {
	return /^\d+$/.test(segment);
}

/**
 * Set a value at a dot notation path in an object.
 * Handles array indices (numeric path segments) by creating arrays.
 *
 * Examples:
 * - "method" -> { method: value }
 * - "options.timeout" -> { options: { timeout: value } }
 * - "headers.0.name" -> { headers: [{ name: value }] }
 * - "headers.1.name" -> { headers: [undefined, { name: value }] }
 */
export function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
	const segments = path.split('.');

	let current: Record<string, unknown> | unknown[] = obj;

	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		const nextSegment = segments[i + 1];
		const isCurrentArray = Array.isArray(current);
		const isNextArray = isArrayIndex(nextSegment);

		const key = isCurrentArray ? Number(segment) : segment;

		if ((current as Record<string, unknown>)[key as string] === undefined) {
			// Create array if next segment is numeric, otherwise object
			(current as Record<string, unknown>)[key as string] = isNextArray ? [] : {};
		}

		current = (current as Record<string, unknown>)[key as string] as
			| Record<string, unknown>
			| unknown[];
	}

	const lastSegment = segments[segments.length - 1];
	const isCurrentArray = Array.isArray(current);
	const key = isCurrentArray ? Number(lastSegment) : lastSegment;
	(current as Record<string, unknown>)[key as string] = value;
}

/**
 * Convert an array of parameter entries to nested INodeParameters.
 *
 * @param entries - Array of parameter entries with path, type, and value
 * @returns Nested INodeParameters object
 * @throws ParameterParseError if any value cannot be parsed
 *
 * @example
 * const entries = [
 *   { path: "method", type: "string", value: "POST" },
 *   { path: "headers.0.name", type: "string", value: "Content-Type" },
 *   { path: "headers.0.value", type: "string", value: "application/json" },
 *   { path: "timeout", type: "number", value: "30" },
 *   { path: "sendHeaders", type: "boolean", value: "true" }
 * ];
 *
 * arrayToNodeParameters(entries);
 * // Returns:
 * // {
 * //   method: "POST",
 * //   headers: [{ name: "Content-Type", value: "application/json" }],
 * //   timeout: 30,
 * //   sendHeaders: true
 * // }
 */
export function arrayToNodeParameters(entries: ParameterEntry[]): INodeParameters {
	const result: INodeParameters = {};

	for (const entry of entries) {
		const value = parseParameterValue(entry);
		setAtPath(result as Record<string, unknown>, entry.path, value);
	}

	return result;
}

/**
 * Merge array-based parameters with existing parameters.
 * Array entries override existing values at their paths.
 *
 * @param existing - Existing node parameters
 * @param entries - Array of parameter entries to merge
 * @returns Merged parameters with array entries taking precedence
 */
export function mergeArrayParameters(
	existing: INodeParameters,
	entries: ParameterEntry[],
): INodeParameters {
	// Deep clone existing parameters to avoid mutations
	const result = deepCopy(existing);

	for (const entry of entries) {
		const value = parseParameterValue(entry);
		setAtPath(result as Record<string, unknown>, entry.path, value);
	}

	return result;
}
