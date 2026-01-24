/**
 * Zod schemas for code-llm-judge structured output.
 *
 * Defines the structure of LLM evaluation responses for code quality analysis.
 */

import { z } from 'zod';

/**
 * Schema for a single code violation.
 */
export const ViolationSchema = z.object({
	type: z.string().describe('Category of the violation (syntax, api-misuse, security, quality)'),
	severity: z
		.enum(['critical', 'major', 'minor'])
		.describe(
			'How serious the violation is - critical blocks execution, major affects correctness, minor is style',
		),
	description: z.string().describe('Clear description of the violation and how to fix it'),
});

export type Violation = z.infer<typeof ViolationSchema>;

/**
 * Schema for a category evaluation result.
 */
export const CategoryResultSchema = z.object({
	score: z.number().min(0).max(1).describe('Score from 0 to 1, where 1 is perfect'),
	violations: z.array(ViolationSchema).describe('List of violations found in this category'),
});

export type CategoryResult = z.infer<typeof CategoryResultSchema>;

/**
 * Schema for the complete code evaluation result.
 */
export const CodeEvaluationResultSchema = z.object({
	overallScore: z
		.number()
		.min(0)
		.max(1)
		.describe('Overall code quality score from 0 to 1, weighted by violation severity'),
	expressionSyntax: CategoryResultSchema.describe(
		'Evaluation of n8n expression syntax - checks for proper ={{...}} format with = prefix',
	),
	apiUsage: CategoryResultSchema.describe(
		'Evaluation of SDK API usage - checks for correct method chaining and patterns',
	),
	security: CategoryResultSchema.describe(
		'Evaluation of security issues - checks for hardcoded credentials, API keys, secrets',
	),
	codeQuality: CategoryResultSchema.describe(
		'Evaluation of general code quality - unused variables, orphaned nodes, dead code',
	),
	summary: z.string().describe('Brief summary of the overall code quality and main issues found'),
});

export type CodeEvaluationResult = z.infer<typeof CodeEvaluationResultSchema>;
