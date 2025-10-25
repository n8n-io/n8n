import { z } from 'zod';

import type { PromptCategorization, WorkflowTechniqueType } from '../../src/types/categorization';

/**
 * Test case for categorization evaluation
 */
export const categorizationTestCaseSchema = z.object({
	id: z.string(),
	prompt: z.string(),
});

export type CategorizationTestCase = z.infer<typeof categorizationTestCaseSchema>;

/**
 * Result of a single categorization test
 */
export interface CategorizationTestResult {
	testCase: CategorizationTestCase;
	categorization: PromptCategorization;
	techniqueDescriptions: Record<WorkflowTechniqueType, string>;
	executionTime: number;
	error?: string;
}

/**
 * Technique frequency statistics
 */
export interface TechniqueFrequency {
	technique: WorkflowTechniqueType;
	description: string;
	count: number;
	percentage: number;
}

/**
 * Summary of categorization evaluation results
 */
export interface CategorizationEvaluationSummary {
	totalPrompts: number;
	successfulCategorizations: number;
	failedCategorizations: number;
	averageConfidence: number;
	averageExecutionTime: number;
	techniqueFrequencies: TechniqueFrequency[];
}

/**
 * Complete categorization evaluation output
 */
export interface CategorizationEvaluationOutput {
	timestamp: string;
	summary: CategorizationEvaluationSummary;
	results: CategorizationTestResult[];
}
