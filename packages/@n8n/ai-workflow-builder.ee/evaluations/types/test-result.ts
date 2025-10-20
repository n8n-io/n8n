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
 * Cache statistics for prompt caching analysis
 */
export interface CacheStatistics {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	cacheHitRate: number;
	estimatedCostSavings: number;
}

/**
 * Cache statistics for a single message/API call
 */
export interface MessageCacheStats {
	messageIndex: number;
	timestamp: string;
	messageType: 'user' | 'assistant' | 'tool_call' | 'tool_response';
	role?: string;
	toolName?: string;
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	cacheHitRate: number;
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
	cacheStats?: CacheStatistics;
	error?: string;
}
