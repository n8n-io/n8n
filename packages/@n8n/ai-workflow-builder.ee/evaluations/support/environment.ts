import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import { loadNodesFromFile } from './load-nodes.js';
import { anthropicClaudeSonnet45 } from '../../src/llm-config.js';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import type { EvalLogger } from '../harness/logger.js';
import {
	createTraceFilters,
	isMinimalTracingEnabled,
	type TraceFilters,
} from '../langsmith/trace-filters.js';

/** Maximum batch size in bytes for trace uploads (2MB - reduced to avoid 403 errors) */
const TRACE_BATCH_SIZE_LIMIT = 2_000_000;

/** Number of concurrent trace batch uploads */
const TRACE_BATCH_CONCURRENCY = 1;

export interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	tracer?: LangChainTracer;
	lsClient?: Client;
	/** Trace filtering utilities (only present when minimal tracing is enabled) */
	traceFilters?: TraceFilters;
}

/**
 * Sets up the LLM with proper configuration
 * @returns Configured LLM instance
 * @throws Error if N8N_AI_ANTHROPIC_KEY environment variable is not set
 */
export async function setupLLM(): Promise<BaseChatModel> {
	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY;
	if (!apiKey) {
		throw new Error('N8N_AI_ANTHROPIC_KEY environment variable is required');
	}
	return await anthropicClaudeSonnet45({ apiKey });
}

/**
 * Creates a LangChain tracer for monitoring agent execution
 * @param projectName - Name of the LangSmith project
 * @returns LangChainTracer instance or undefined if API key not provided
 */
export function createTracer(client: Client, projectName: string): LangChainTracer | undefined {
	return new LangChainTracer({
		client,
		projectName,
	});
}

/**
 * Result of creating a LangSmith client with optional filtering.
 */
export interface LangsmithClientResult {
	client: Client;
	/** Trace filters (only present when minimal tracing is enabled) */
	traceFilters?: TraceFilters;
}

/**
 * Creates a Langsmith client if API key is available.
 * By default, minimal tracing is enabled to reduce payload sizes and avoid 403 errors.
 * Set LANGSMITH_MINIMAL_TRACING=false to disable filtering and get full traces.
 * @param logger - Optional logger for trace filter output
 * @returns LangSmith client with optional trace filters, or undefined if no API key
 */
export function createLangsmithClient(logger?: EvalLogger): LangsmithClientResult | undefined {
	const apiKey = process.env.LANGSMITH_API_KEY;
	if (!apiKey) {
		return undefined;
	}

	const minimalTracing = isMinimalTracingEnabled();

	if (!minimalTracing) {
		return { client: new Client({ apiKey }) };
	}

	// Create closure-scoped filters for this client instance
	const traceFilters = createTraceFilters(logger);

	const client = new Client({
		apiKey,
		// Filter large fields from traces to avoid 403 payload errors
		hideInputs: traceFilters.filterInputs,
		hideOutputs: traceFilters.filterOutputs,
		// Reduce batch size and concurrency for high-volume scenarios
		batchSizeBytesLimit: TRACE_BATCH_SIZE_LIMIT,
		batchSizeLimit: 10, // Limit runs per batch (default 100) to avoid 403 multipart errors
		traceBatchConcurrency: TRACE_BATCH_CONCURRENCY,
	});

	return { client, traceFilters };
}

/**
 * Sets up the test environment with LLM, nodes, and tracing
 * @param logger - Optional logger for trace filter output
 * @returns Test environment configuration
 */
export async function setupTestEnvironment(logger?: EvalLogger): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();
	const llm = await setupLLM();
	const lsClientResult = createLangsmithClient(logger);

	const lsClient = lsClientResult?.client;
	const traceFilters = lsClientResult?.traceFilters;
	const tracer = lsClient ? createTracer(lsClient, 'workflow-builder-evaluation') : undefined;

	return { parsedNodeTypes, llm, tracer, lsClient, traceFilters };
}

export interface CreateAgentOptions {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	tracer?: LangChainTracer;
	featureFlags?: BuilderFeatureFlags;
	experimentName?: string;
}

/**
 * Creates a new WorkflowBuilderAgent instance
 * @param options - Agent configuration options
 * @returns Configured WorkflowBuilderAgent
 */
export function createAgent(options: CreateAgentOptions): WorkflowBuilderAgent {
	const { parsedNodeTypes, llm, tracer, featureFlags, experimentName } = options;

	return new WorkflowBuilderAgent({
		parsedNodeTypes,
		llmSimpleTask: llm,
		llmComplexTask: llm,
		checkpointer: new MemorySaver(),
		tracer,
		featureFlags,
		runMetadata: {
			featureFlags: featureFlags ?? {},
			experimentName,
		},
	});
}

/**
 * Get concurrency limit from environment
 * @returns Concurrency limit (defaults to 5)
 */
export function getConcurrencyLimit(): number {
	const envConcurrency = process.env.EVALUATION_CONCURRENCY;
	if (envConcurrency) {
		const parsed = parseInt(envConcurrency, 10);
		if (!isNaN(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return 5;
}

/**
 * Check if test cases should be generated
 * @returns True if test cases should be generated
 */
export function shouldGenerateTestCases(): boolean {
	return process.env.GENERATE_TEST_CASES === 'true';
}

/**
 * How many test cases to generate based on environment variable
 * @returns Number of test cases to generate (defaults to 10)
 */
export function howManyTestCasesToGenerate(): number {
	const envCount = process.env.GENERATE_TEST_CASES_COUNT;
	if (envCount) {
		const parsed = parseInt(envCount, 10);
		if (!isNaN(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return 10; // Default to 10 if not specified
}
