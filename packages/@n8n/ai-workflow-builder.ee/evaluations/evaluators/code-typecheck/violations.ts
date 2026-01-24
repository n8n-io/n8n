/**
 * Code violation type definitions for the code-typecheck evaluator.
 */

export const CODE_VIOLATION_NAMES = [
	'type-error',
	'missing-required-parameter',
	'unknown-property',
	'invalid-type-argument',
	'syntax-error',
	'undefined-identifier',
	'incompatible-type',
] as const;

export type CodeViolationName = (typeof CODE_VIOLATION_NAMES)[number];

export interface CodeViolation {
	name: CodeViolationName;
	type: 'critical' | 'major' | 'minor';
	description: string;
	lineNumber?: number;
	column?: number;
	pointsDeducted: number;
}
