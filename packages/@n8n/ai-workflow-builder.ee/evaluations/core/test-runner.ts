import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { WorkflowBuilderAgent } from '../../src/workflow-builder-agent';
import { evaluateWorkflow } from '../chains/workflow-evaluator';
import { programmaticEvaluation } from '../programmatic/programmatic-evaluation';
import type { EvaluationInput, TestCase } from '../types/evaluation';
import { isWorkflowStateValues, safeExtractUsage } from '../types/langsmith';
import type { TestResult } from '../types/test-result';
import { calculateCacheStats } from '../utils/cache-analyzer';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';

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
			efficiency: {
				score: 0,
				violations: [],
				redundancyScore: 0,
				pathOptimization: 0,
				nodeCountEfficiency: 0,
			},
			dataFlow: {
				score: 0,
				violations: [],
			},
			maintainability: {
				score: 0,
				violations: [],
				nodeNamingQuality: 0,
				workflowOrganization: 0,
				modularity: 0,
			},
			bestPractices: {
				score: 0,
				violations: [],
				techniques: [],
			},
			structuralSimilarity: { score: 0, violations: [], applicable: false },
			summary: `Evaluation failed: ${errorMessage}`,
		},
		programmaticEvaluationResult: {
			overallScore: 0,
			connections: { violations: [], score: 0 },
			nodes: { violations: [], score: 0 },
			trigger: { violations: [], score: 0 },
			agentPrompt: { violations: [], score: 0 },
			tools: { violations: [], score: 0 },
			fromAi: { violations: [], score: 0 },
			similarity: null,
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
	nodeTypes: INodeTypeDescription[],
	userId: string = 'test-user',
): Promise<TestResult> {
	try {
		// Generate workflow
		const startTime = Date.now();
		await consumeGenerator(agent.chat(getChatPayload(testCase.prompt, testCase.id), userId));
		const generationTime = Date.now() - startTime;

		// Get generated workflow with validation
		const state = await agent.getState(testCase.id, userId);

		// Validate workflow state
		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: missing or malformed workflow');
		}

		const generatedWorkflow = state.values.workflowJSON;

		// Extract cache statistics from messages
		const usage = safeExtractUsage(state.values.messages);
		const cacheStats = calculateCacheStats(usage);

		// Evaluate
		const evaluationInput: EvaluationInput = {
			userPrompt: testCase.prompt,
			generatedWorkflow,
			referenceWorkflow: testCase.referenceWorkflow,
			referenceWorkflows: testCase.referenceWorkflows,
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);
		const programmaticEvaluationResult = await programmaticEvaluation(evaluationInput, nodeTypes);

		return {
			testCase,
			generatedWorkflow,
			evaluationResult,
			programmaticEvaluationResult,
			generationTime,
			cacheStats,
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
