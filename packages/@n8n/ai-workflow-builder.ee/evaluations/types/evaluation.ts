import { z } from 'zod';

import type { SimpleWorkflow } from '../../src/types/workflow';

// Violation schema
const violationSchema = z.object({
	type: z.enum(['critical', 'major', 'minor']),
	description: z.string(),
	pointsDeducted: z.number().min(0),
});

// Category score schema
const categoryScoreSchema = z.object({
	violations: z.array(violationSchema),
	score: z.number().min(0).max(1),
});

// Structural similarity schema (with applicable flag)
const structuralSimilaritySchema = z.object({
	violations: z.array(violationSchema),
	score: z.number().min(0).max(1),
	applicable: z
		.boolean()
		.describe('Whether this category was evaluated (based on reference workflow availability)'),
});

// Main evaluation result schema
export const evaluationResultSchema = z.object({
	overallScore: z
		.number()
		.min(0)
		.max(1)
		.describe('Weighted average score across all categories (0-1)'),
	functionality: categoryScoreSchema,
	connections: categoryScoreSchema,
	expressions: categoryScoreSchema,
	nodeConfiguration: categoryScoreSchema,
	structuralSimilarity: structuralSimilaritySchema,
	summary: z.string().describe('2-3 sentences summarizing main strengths and weaknesses'),
	criticalIssues: z
		.array(z.string())
		.describe('List of issues that would prevent the workflow from functioning')
		.optional(),
});

// Type exports
export type Violation = z.infer<typeof violationSchema>;
export type CategoryScore = z.infer<typeof categoryScoreSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

// Test case schema for evaluation
export const testCaseSchema = z.object({
	id: z.string(),
	name: z.string(),
	prompt: z.string(),
	referenceWorkflow: z.custom<SimpleWorkflow>().optional(),
});

export type TestCase = z.infer<typeof testCaseSchema>;

// Evaluation input schema
export const evaluationInputSchema = z.object({
	userPrompt: z.string(),
	generatedWorkflow: z.custom<SimpleWorkflow>(),
	referenceWorkflow: z.custom<SimpleWorkflow>().optional(),
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
