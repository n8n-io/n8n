import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import { DEFAULT_MODEL, getApiKeyEnvVar, MODEL_FACTORIES, type ModelId } from '@/llm-config';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';
import { WorkflowBuilderAgent } from '@/workflow-builder-agent';

import { loadNodesFromFile } from './load-nodes.js';
import type { EvalLogger } from '../harness/logger.js';
import {
	createTraceFilters,
	isMinimalTracingEnabled,
	type TraceFilters,
} from '../langsmith/trace-filters.js';

/** Maximum memory for trace queue (3GB) */
const MAX_INGEST_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;

// ============================================================================
// Stage Models Configuration
// ============================================================================

/**
 * Configuration for per-stage model selection.
 * All fields except 'default' are optional - unspecified stages use the default model.
 */
export interface StageModels {
	/** Default model for all stages */
	default: ModelId;
	/** Model for supervisor stage (routing decisions) */
	supervisor?: ModelId;
	/** Model for responder stage (final user responses) */
	responder?: ModelId;
	/** Model for discovery stage (node discovery) */
	discovery?: ModelId;
	/** Model for builder stage (workflow structure) */
	builder?: ModelId;
	/** Model for configurator stage (node configuration) */
	configurator?: ModelId;
	/** Model for parameter updater (within configurator) */
	parameterUpdater?: ModelId;
	/** Model for LLM judge evaluation */
	judge?: ModelId;
}

/**
 * Resolved LLM instances for each stage.
 * All fields are populated (using default model as fallback).
 */
export interface ResolvedStageLLMs {
	default: BaseChatModel;
	supervisor: BaseChatModel;
	responder: BaseChatModel;
	discovery: BaseChatModel;
	builder: BaseChatModel;
	configurator: BaseChatModel;
	parameterUpdater: BaseChatModel;
	judge: BaseChatModel;
}

export interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	/** Resolved LLM instances for each stage */
	llms: ResolvedStageLLMs;
	tracer?: LangChainTracer;
	lsClient?: Client;
	/** Trace filtering utilities (only present when minimal tracing is enabled) */
	traceFilters?: TraceFilters;
}

/**
 * Sets up an LLM with proper configuration
 * @param modelId - Model identifier (defaults to DEFAULT_MODEL)
 * @returns Configured LLM instance
 * @throws Error if the required API key environment variable is not set
 */
export async function setupLLM(modelId: ModelId = DEFAULT_MODEL): Promise<BaseChatModel> {
	const envVar = getApiKeyEnvVar(modelId);
	const apiKey = process.env[envVar];
	if (!apiKey) {
		throw new Error(`${envVar} environment variable is required for model ${modelId}`);
	}
	const factory = MODEL_FACTORIES[modelId];
	return await factory({ apiKey });
}

/**
 * Resolves all stage models to LLM instances.
 * Unspecified stages fall back to the default model.
 * @param stageModels - Per-stage model configuration
 * @returns Resolved LLM instances for each stage
 */
export async function resolveStageModels(stageModels: StageModels): Promise<ResolvedStageLLMs> {
	const defaultLLM = await setupLLM(stageModels.default);

	// For stages without specific model, use default
	// For parameter updater, fall back to configurator if not specified
	const configuratorLLM = stageModels.configurator
		? await setupLLM(stageModels.configurator)
		: defaultLLM;

	return {
		default: defaultLLM,
		supervisor: stageModels.supervisor ? await setupLLM(stageModels.supervisor) : defaultLLM,
		responder: stageModels.responder ? await setupLLM(stageModels.responder) : defaultLLM,
		discovery: stageModels.discovery ? await setupLLM(stageModels.discovery) : defaultLLM,
		builder: stageModels.builder ? await setupLLM(stageModels.builder) : defaultLLM,
		configurator: configuratorLLM,
		parameterUpdater: stageModels.parameterUpdater
			? await setupLLM(stageModels.parameterUpdater)
			: configuratorLLM,
		judge: stageModels.judge ? await setupLLM(stageModels.judge) : defaultLLM,
	};
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
		// Increase queue memory limit for high-concurrency evals
		maxIngestMemoryBytes: MAX_INGEST_MEMORY_BYTES,
	});

	return { client, traceFilters };
}

/**
 * Sets up the test environment with LLM, nodes, and tracing
 * @param stageModels - Per-stage model configuration (optional, uses default model if not provided)
 * @param logger - Optional logger for trace filter output
 * @returns Test environment configuration
 */
export async function setupTestEnvironment(
	stageModels?: StageModels,
	logger?: EvalLogger,
): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();

	// Use provided stage models or default configuration
	const models: StageModels = stageModels ?? { default: DEFAULT_MODEL };
	const llms = await resolveStageModels(models);

	const lsClientResult = createLangsmithClient(logger);

	const lsClient = lsClientResult?.client;
	const traceFilters = lsClientResult?.traceFilters;
	const tracer = lsClient ? createTracer(lsClient, 'workflow-builder-evaluation') : undefined;

	return {
		parsedNodeTypes,
		llms,
		tracer,
		lsClient,
		traceFilters,
	};
}

export interface CreateAgentOptions {
	parsedNodeTypes: INodeTypeDescription[];
	/** Per-stage LLMs resolved from model configuration */
	llms: ResolvedStageLLMs;
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
	const { parsedNodeTypes, llms, tracer, featureFlags, experimentName } = options;

	return new WorkflowBuilderAgent({
		parsedNodeTypes,
		stageLLMs: {
			supervisor: llms.supervisor,
			responder: llms.responder,
			discovery: llms.discovery,
			builder: llms.builder,
			configurator: llms.configurator,
			parameterUpdater: llms.parameterUpdater,
		},
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
