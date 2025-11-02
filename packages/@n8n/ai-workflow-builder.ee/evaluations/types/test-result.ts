import type { ProgrammaticEvaluationResult } from '@/validation/types';

import type { TestCase, EvaluationResult } from './evaluation';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

export type {
	ProgrammaticEvaluationResult,
	SingleEvaluatorResult,
} from '@/validation/types';

/**
 * Cache statistics for prompt caching analysis
 */
export interface CacheStatistics {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	cacheHitRate: number;
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
