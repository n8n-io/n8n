/**
 * Shared formatting utilities for CRDT resolved expression values.
 * Used across multiple CRDT components and composables.
 */

import type { ResolvedValue } from '../types/executionDocument.types';

/**
 * Format a value for display as a string.
 * Matches production n8n behavior where objects are formatted as [Object: {...}]
 * and arrays as [Array: [...]]
 */
export function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);

	// Format objects/arrays to match production behavior
	// Production uses Expression.convertObjectValueToString which outputs [Type: value]
	if (typeof value === 'object') {
		try {
			const typeName = Array.isArray(value) ? 'Array' : 'Object';
			const jsonStr = JSON.stringify(value)
				.replace(/,"/g, ', "') // spacing for
				.replace(/":/g, '": '); // readability
			return `[${typeName}: ${jsonStr}]`;
		} catch {
			return String(value);
		}
	}

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Format a ResolvedValue for display.
 * Matches production behavior where 'pending' state shows empty string.
 */
export function formatResolvedValue(resolved: ResolvedValue): string {
	switch (resolved.state) {
		case 'valid':
			return formatValue(resolved.resolved);
		case 'pending':
			// Match production: show empty string for pending state
			// (expressions waiting for execution data)
			return '';
		case 'invalid':
			return `[ERROR: ${resolved.error ?? 'Invalid expression'}]`;
		default:
			return '';
	}
}
