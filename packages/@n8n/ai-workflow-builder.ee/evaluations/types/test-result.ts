import type { TestCase, EvaluationResult, Violation } from './evaluation';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

export type SingleEvaluatorResult = {
	violations: Violation[];
	score: number;
};

export interface ProgrammaticEvaluationResult {
	overallScore: number;
	connections: SingleEvaluatorResult;
	trigger: SingleEvaluatorResult;
	agentPrompt: SingleEvaluatorResult;
	tools: SingleEvaluatorResult;
	fromAi: SingleEvaluatorResult;
}

/**
 * Result of running a single test case
 */
export interface TestResult {
	testCase: TestCase;
	generatedWorkflow: SimpleWorkflow;
	evaluationResult: EvaluationResult;
	programmaticEvaluationResult: ProgrammaticEvaluationResult;
	generationTime: number;
	error?: string;
}
