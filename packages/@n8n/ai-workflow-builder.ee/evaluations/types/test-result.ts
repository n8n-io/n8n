import type { TestCase, EvaluationResult } from './evaluation.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

/**
 * Result of running a single test case
 */
export interface TestResult {
	testCase: TestCase;
	generatedWorkflow: SimpleWorkflow;
	evaluationResult: EvaluationResult;
	generationTime: number;
	error?: string;
}
