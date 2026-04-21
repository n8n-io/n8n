import type { ValidationWarning } from './types';

/**
 * Separate errors (blocking) from warnings (informational) in validation results.
 *
 * Error codes that are structural blockers (from graph validation errors or schema
 * validation errors) should prevent saving. Warnings are informational only.
 */
export function partitionWarnings(warnings: ValidationWarning[]): {
	errors: ValidationWarning[];
	informational: ValidationWarning[];
} {
	const informationalCodes = new Set(['MISSING_TRIGGER', 'DISCONNECTED_NODE']);

	const errors: ValidationWarning[] = [];
	const informational: ValidationWarning[] = [];

	for (const w of warnings) {
		if (informationalCodes.has(w.code)) {
			informational.push(w);
		} else {
			errors.push(w);
		}
	}

	return { errors, informational };
}
