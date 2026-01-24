/**
 * Graph validation evaluator - validates the internal graph structure
 * of generated TypeScript SDK code using workflow-sdk's validate() method.
 */
import { parseWorkflowCodeToBuilder } from '@n8n/workflow-sdk';

import type {
	ProgrammaticViolation,
	ProgrammaticViolationName,
	SingleEvaluatorResult,
} from '@/validation/types';

/**
 * Map SDK validation codes to programmatic violation names.
 * This explicit mapping ensures type safety.
 */
const CODE_TO_VIOLATION_NAME: Record<string, ProgrammaticViolationName> = {
	NO_NODES: 'graph-no-nodes',
	DISCONNECTED_NODE: 'graph-disconnected-node',
	MERGE_SINGLE_INPUT: 'graph-merge-single-input',
	FROM_AI_IN_NON_TOOL: 'graph-from-ai-in-non-tool',
	AGENT_STATIC_PROMPT: 'graph-agent-static-prompt',
	AGENT_NO_SYSTEM_MESSAGE: 'graph-agent-no-system-message',
	HARDCODED_CREDENTIALS: 'graph-hardcoded-credentials',
	SET_CREDENTIAL_FIELD: 'graph-set-credential-field',
	TOOL_NO_PARAMETERS: 'graph-tool-no-parameters',
	MISSING_TRIGGER: 'graph-missing-trigger',
};

/**
 * Get violation name from SDK code, defaulting to graph-parse-error for unknown codes.
 */
function getViolationName(code: string): ProgrammaticViolationName {
	return CODE_TO_VIOLATION_NAME[code] ?? 'graph-parse-error';
}

/**
 * Map validation warning/error codes to violation types
 */
function getViolationType(code: string): 'critical' | 'major' | 'minor' | 'suggestion' {
	// Errors are critical
	if (code === 'NO_NODES') {
		return 'critical';
	}

	// Major warnings that likely cause issues
	if (
		code === 'DISCONNECTED_NODE' ||
		code === 'MERGE_SINGLE_INPUT' ||
		code === 'FROM_AI_IN_NON_TOOL'
	) {
		return 'major';
	}

	// Minor warnings about best practices
	if (
		code === 'AGENT_STATIC_PROMPT' ||
		code === 'AGENT_NO_SYSTEM_MESSAGE' ||
		code === 'HARDCODED_CREDENTIALS' ||
		code === 'SET_CREDENTIAL_FIELD' ||
		code === 'TOOL_NO_PARAMETERS'
	) {
		return 'minor';
	}

	// Missing trigger is just a suggestion (workflows can be executed manually)
	if (code === 'MISSING_TRIGGER') {
		return 'suggestion';
	}

	return 'minor';
}

/**
 * Get points deducted for a violation based on its type
 */
function getPointsDeducted(type: 'critical' | 'major' | 'minor' | 'suggestion'): number {
	switch (type) {
		case 'critical':
			return 25;
		case 'major':
			return 15;
		case 'minor':
			return 5;
		case 'suggestion':
			return 2;
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
		// Parse code to WorkflowBuilder
		const builder = parseWorkflowCodeToBuilder(generatedCode);

		// Run graph validation
		const validation = builder.validate();

		// Convert errors to violations
		for (const error of validation.errors) {
			const violationType = getViolationType(error.code);
			violations.push({
				name: getViolationName(error.code),
				type: violationType,
				description: error.message,
				pointsDeducted: getPointsDeducted(violationType),
			});
		}

		// Convert warnings to violations
		for (const warning of validation.warnings) {
			const violationType = getViolationType(warning.code);
			violations.push({
				name: getViolationName(warning.code),
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
