import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import { getModel, type ModelKey } from '../../src/llm-registry.js';
import type { BuilderFeatureFlags, ModelOverrides } from '../../src/workflow-builder-agent.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import { loadNodesFromFile } from '../load-nodes.js';
import { filterTraceInputs, filterTraceOutputs, isMinimalTracingEnabled } from './trace-filters.js';

const DEFAULT_MODEL: ModelKey = 'claude-sonnet';

/** Maximum batch size in bytes for trace uploads (10MB) */
const TRACE_BATCH_SIZE_LIMIT = 10_000_000;

/** Number of concurrent trace batch uploads */
const TRACE_BATCH_CONCURRENCY = 2;

export interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	tracer?: LangChainTracer;
	lsClient?: Client;
}

/**
 * Configuration for model selection in evaluations.
 */
export interface ModelConfig {
	/** Default model for generation (defaults to 'claude-sonnet') */
	defaultModel?: ModelKey;
	/** Model for judging (defaults to defaultModel) */
	judgeModel?: ModelKey;
	/** Per-stage model overrides */
	stageOverrides?: Partial<Record<keyof ModelOverrides, ModelKey>>;
}

/**
 * Resolved model instances ready for use.
 */
export interface ResolvedModels {
	defaultModel: BaseChatModel;
	judgeModel: BaseChatModel;
	modelOverrides?: ModelOverrides;
}

/**
 * Sets up models based on configuration.
 * @param config - Model configuration (all optional, uses defaults if not provided)
 * @returns Resolved model instances
 */
export async function setupModels(config?: ModelConfig): Promise<ResolvedModels> {
	const modelKey = config?.defaultModel ?? DEFAULT_MODEL;
	const judgeKey = config?.judgeModel ?? modelKey;

	const defaultModel = await getModel(modelKey);
	const judgeModel = judgeKey === modelKey ? defaultModel : await getModel(judgeKey);

	// Resolve stage overrides if provided
	let modelOverrides: ModelOverrides | undefined;
	if (config?.stageOverrides && Object.keys(config.stageOverrides).length > 0) {
		modelOverrides = {};
		for (const [stage, key] of Object.entries(config.stageOverrides)) {
			if (key) {
				(modelOverrides as Record<string, BaseChatModel>)[stage] = await getModel(key as ModelKey);
			}
		}
	}

	return { defaultModel, judgeModel, modelOverrides };
}

/**
 * Sets up the LLM with default configuration.
 * @deprecated Use setupModels() for new code. This is kept for backward compatibility.
 * @returns Configured LLM instance using default model
 */
export async function setupLLM(): Promise<BaseChatModel> {
	const { defaultModel } = await setupModels();
	return defaultModel;
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
 * Creates a Langsmith client if API key is available.
 * By default, minimal tracing is enabled to reduce payload sizes and avoid 403 errors.
 * Set LANGSMITH_MINIMAL_TRACING=false to disable filtering and get full traces.
 * @returns Langsmith client or undefined
 */
export function createLangsmithClient(): Client | undefined {
	const apiKey = process.env.LANGSMITH_API_KEY;
	if (!apiKey) {
		return undefined;
	}

	const minimalTracing = isMinimalTracingEnabled();

	return new Client({
		apiKey,
		// Filter large fields from traces to avoid 403 payload errors
		hideInputs: minimalTracing ? filterTraceInputs : undefined,
		hideOutputs: minimalTracing ? filterTraceOutputs : undefined,
		// Reduce batch size and concurrency for high-volume scenarios
		batchSizeBytesLimit: minimalTracing ? TRACE_BATCH_SIZE_LIMIT : undefined,
		traceBatchConcurrency: minimalTracing ? TRACE_BATCH_CONCURRENCY : undefined,
	});
}

/**
 * Sets up the test environment with LLM, nodes, and tracing
 * @returns Test environment configuration
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();
	const llm = await setupLLM();
	const lsClient = createLangsmithClient();

	const tracer = lsClient ? createTracer(lsClient, 'workflow-builder-evaluation') : undefined;

	return { parsedNodeTypes, llm, tracer, lsClient };
}

export interface CreateAgentOptions {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	modelOverrides?: ModelOverrides;
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
	const { parsedNodeTypes, llm, modelOverrides, tracer, featureFlags, experimentName } = options;

	return new WorkflowBuilderAgent({
		parsedNodeTypes,
		defaultModel: llm,
		modelOverrides,
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
