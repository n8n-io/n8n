import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { SimpleWorkflow } from '../../src/types/workflow.js';
import type { WorkflowBuilderAgent, ChatPayload } from '../../src/workflow-builder-agent.js';
import { evaluateWorkflow } from '../chains/workflow-evaluator.js';
import type { EvaluationInput, EvaluationResult, TestCase } from '../types/evaluation.js';
import { isWorkflowStateValues } from '../types/langsmith.js';
import type { TestResult } from '../types/test-result.js';

/**
 * Creates an error result for a failed test
 * @param testCase - The test case that failed
 * @param error - The error that occurred
 * @returns TestResult with error information
 */
export function createErrorResult(testCase: TestCase, error: unknown): TestResult {
	const errorMessage = error instanceof Error ? error.message : String(error);

	return {
		testCase,
		generatedWorkflow: { nodes: [], connections: {}, name: 'Generated Workflow' },
		evaluationResult: {
			overallScore: 0,
			functionality: { score: 0, violations: [] },
			connections: { score: 0, violations: [] },
			expressions: { score: 0, violations: [] },
			nodeConfiguration: { score: 0, violations: [] },
			structuralSimilarity: { score: 0, violations: [], applicable: false },
			summary: `Evaluation failed: ${errorMessage}`,
		},
		generationTime: 0,
		error: errorMessage,
	};
}

/**
 * Runs a single test case by generating a workflow and evaluating it
 * @param agent - The workflow builder agent to use
 * @param llm - Language model for evaluation
 * @param testCase - Test case to execute
 * @param userId - User ID for the session
 * @returns Test result with generated workflow and evaluation
 */
export async function runSingleTest(
	agent: WorkflowBuilderAgent,
	llm: BaseChatModel,
	testCase: TestCase,
	userId: string = 'test-user',
): Promise<TestResult> {
	try {
		const chatPayload: ChatPayload = {
			message: testCase.prompt,
			workflowContext: {
				currentWorkflow: { id: testCase.id, nodes: [], connections: {} },
			},
		};

		// Generate workflow
		const startTime = Date.now();
		let messageCount = 0;
		for await (const _output of agent.chat(chatPayload, userId)) {
			messageCount++;
		}
		const generationTime = Date.now() - startTime;

		// Get generated workflow with validation
		const state = await agent.getState(testCase.id, userId);

		// Validate workflow state
		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: missing or malformed workflow');
		}

		const generatedWorkflow = state.values.workflowJSON;

		// Evaluate
		const evaluationInput: EvaluationInput = {
			userPrompt: testCase.prompt,
			generatedWorkflow,
			referenceWorkflow: testCase.referenceWorkflow,
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

		return {
			testCase,
			generatedWorkflow,
			evaluationResult,
			generationTime,
		};
	} catch (error) {
		return createErrorResult(testCase, error);
	}
}

/**
 * Initialize test tracking map
 * @param testCases - Array of test cases
 * @returns Map of test ID to status
 */
export function initializeTestTracking(
	testCases: TestCase[],
): Record<string, 'pending' | 'pass' | 'fail'> {
	const tracking: Record<string, 'pending' | 'pass' | 'fail'> = {};
	for (const testCase of testCases) {
		tracking[testCase.id] = 'pending';
	}
	return tracking;
}

/**
 * Create a test result from a workflow state
 * @param testCase - The test case
 * @param workflow - Generated workflow
 * @param evaluationResult - Evaluation result
 * @param generationTime - Time taken to generate workflow
 * @returns TestResult
 */
export function createTestResult(
	testCase: TestCase,
	workflow: SimpleWorkflow,
	evaluationResult: EvaluationResult,
	generationTime: number,
): TestResult {
	return {
		testCase,
		generatedWorkflow: workflow,
		evaluationResult,
		generationTime,
	};
}
