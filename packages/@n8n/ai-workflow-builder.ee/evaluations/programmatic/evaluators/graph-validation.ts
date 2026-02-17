/**
 * Graph validation evaluator - validates the internal graph structure
 * of generated TypeScript SDK code using workflow-sdk's validate() method.
 */
import { parseWorkflowCodeToBuilder } from '@n8n/workflow-sdk';

import { stripImportStatements } from '@/code-builder/utils/extract-code';
import type {
	ProgrammaticViolation,
	ProgrammaticViolationName,
	SingleEvaluatorResult,
} from '@/validation/types';

/**
 * Convert SDK validation code (SCREAMING_SNAKE_CASE) to violation name (graph-kebab-case).
 * E.g., "NO_NODES" -> "graph-no-nodes", "DISCONNECTED_NODE" -> "graph-disconnected-node"
 */
function codeToViolationName(code: string): ProgrammaticViolationName {
	const kebab = code.toLowerCase().replace(/_/g, '-');
	return `graph-${kebab}` as ProgrammaticViolationName;
}

/**
 * Get violation type from a validation issue.
 * Uses the violationLevel from the issue if present, otherwise defaults to 'minor'.
 */
function getViolationType(issue: {
	violationLevel?: 'critical' | 'major' | 'minor';
}): 'critical' | 'major' | 'minor' {
	return issue.violationLevel ?? 'minor';
}

/**
 * Get points deducted for a violation based on its type
 */
function getPointsDeducted(type: 'critical' | 'major' | 'minor'): number {
	switch (type) {
		case 'critical':
			return 25;
		case 'major':
			return 15;
		case 'minor':
			return 5;
	}
}

/**
 * Evaluate generated TypeScript SDK code using graph validation.
 * Returns violations for any graph structure issues found.
 *
 * @param generatedCode - The TypeScript SDK code to validate
 * @returns Evaluation result with score and violations
 */
export function evaluateGraphValidation(generatedCode: string | undefined): SingleEvaluatorResult {
	// If no code provided, skip evaluation
	if (!generatedCode) {
		return {
			score: 1, // Neutral - not applicable
			violations: [],
		};
	}

	const violations: ProgrammaticViolation[] = [];

	try {
		// Strip import statements before parsing (Acorn uses sourceType: 'script')
		const cleanCode = stripImportStatements(generatedCode);

		// Parse code to WorkflowBuilder
		const builder = parseWorkflowCodeToBuilder(cleanCode);

		// Run graph validation
		const validation = builder.validate();

		// Convert errors to violations
		for (const error of validation.errors) {
			const violationType = getViolationType(error);
			violations.push({
				name: codeToViolationName(error.code),
				type: violationType,
				description: error.message,
				pointsDeducted: getPointsDeducted(violationType),
			});
		}

		// Convert warnings to violations
		for (const warning of validation.warnings) {
			const violationType = getViolationType(warning);
			violations.push({
				name: codeToViolationName(warning.code),
				type: violationType,
				description: warning.message,
				pointsDeducted: getPointsDeducted(violationType),
			});
		}
	} catch (error) {
		// Code parsing failed - this is a critical violation
		violations.push({
			name: 'graph-parse-error',
			type: 'critical',
			description: `Failed to parse code for graph validation: ${error instanceof Error ? error.message : String(error)}`,
			pointsDeducted: 25,
		});
	}

	// Calculate score (start at 100, deduct points)
	const totalDeducted = violations.reduce((sum, v) => sum + v.pointsDeducted, 0);
	const score = Math.max(0, 100 - totalDeducted) / 100;

	return {
		score,
		violations,
	};
}
