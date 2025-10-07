import type { TestCase, EvaluationResult } from './evaluation.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

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
	generationTime: number;
	cacheStats?: CacheStatistics;
	error?: string;
}
