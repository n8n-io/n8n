import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	anthropicClaudeSonnet45,
	anthropicHaiku45,
	anthropicClaudeOpus45,
} from '../../src/llm-config.js';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import { loadNodesFromFile } from '../load-nodes.js';

export type ModelType = 'haiku' | 'sonnet' | 'opus';

/**
 * Configuration for per-agent model selection
 */
export interface AgentModelConfig {
	supervisor?: ModelType;
	responder?: ModelType;
	discovery?: ModelType;
	builder?: ModelType;
	configurator?: ModelType;
	// Fallback for agents not specified
	default?: ModelType;
}

export interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel; // Keep for backward compatibility
	judgeLlm: BaseChatModel;
	agentModels?: {
		supervisor?: BaseChatModel;
		responder?: BaseChatModel;
		discovery?: BaseChatModel;
		builder?: BaseChatModel;
		configurator?: BaseChatModel;
		default: BaseChatModel; // Required fallback
	};
	tracer?: LangChainTracer;
	lsClient?: Client;
}

/**
 * Sets up the LLM with proper configuration
 * @param modelType - The model type to use ('haiku', 'sonnet', or 'opus'). Defaults to 'sonnet'.
 * @returns Configured LLM instance
 * @throws Error if N8N_AI_ANTHROPIC_KEY environment variable is not set
 */
export async function setupLLM(modelType: ModelType = 'sonnet'): Promise<BaseChatModel> {
	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY;
	if (!apiKey) {
		throw new Error('N8N_AI_ANTHROPIC_KEY environment variable is required');
	}

	switch (modelType) {
		case 'haiku':
			return await anthropicHaiku45({ apiKey });
		case 'sonnet':
			return await anthropicClaudeSonnet45({ apiKey });
		case 'opus':
			return await anthropicClaudeOpus45({ apiKey });
		default:
			throw new Error(`Unknown model type: ${modelType}. Must be 'haiku', 'sonnet', or 'opus'`);
	}
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
 * Creates a Langsmith client if API key is available
 * @returns Langsmith client or undefined
 */
export function createLangsmithClient(): Client | undefined {
	const apiKey = process.env.LANGSMITH_API_KEY;
	if (!apiKey) {
		return undefined;
	}
	return new Client({ apiKey });
}

/**
 * Sets up the test environment with LLM, nodes, and tracing
 * @param modelType - The model type to use for workflow generation ('haiku', 'sonnet', or 'opus'). Defaults to 'sonnet'.
 * @param judgeModelType - The model type to use for LLM judge evaluation. Defaults to 'sonnet'.
 * @param agentModelConfig - Optional per-agent model configuration. If not provided, all agents use modelType.
 * @returns Test environment configuration
 */
export async function setupTestEnvironment(
	modelType: ModelType = 'sonnet',
	judgeModelType: ModelType = 'sonnet',
	agentModelConfig?: AgentModelConfig,
): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();
	const llm = await setupLLM(modelType);
	const judgeLlm = await setupLLM(judgeModelType);
	const lsClient = createLangsmithClient();

	const tracer = lsClient ? createTracer(lsClient, 'workflow-builder-evaluation') : undefined;

	// If agentModelConfig is provided, create per-agent models
	let agentModels: TestEnvironment['agentModels'] | undefined;
	if (agentModelConfig) {
		const defaultModelType = agentModelConfig.default ?? modelType;
		const defaultModel = await setupLLM(defaultModelType);

		// Create models for each agent, reusing instances when same model type is used
		const modelCache = new Map<ModelType, BaseChatModel>();
		modelCache.set(defaultModelType, defaultModel);

		const getOrCreateModel = async (
			agentModelType: ModelType | undefined,
		): Promise<BaseChatModel> => {
			const type = agentModelType ?? defaultModelType;
			if (!modelCache.has(type)) {
				modelCache.set(type, await setupLLM(type));
			}
			return modelCache.get(type)!;
		};

		agentModels = {
			supervisor: agentModelConfig.supervisor
				? await getOrCreateModel(agentModelConfig.supervisor)
				: undefined,
			responder: agentModelConfig.responder
				? await getOrCreateModel(agentModelConfig.responder)
				: undefined,
			discovery: agentModelConfig.discovery
				? await getOrCreateModel(agentModelConfig.discovery)
				: undefined,
			builder: agentModelConfig.builder
				? await getOrCreateModel(agentModelConfig.builder)
				: undefined,
			configurator: agentModelConfig.configurator
				? await getOrCreateModel(agentModelConfig.configurator)
				: undefined,
			default: defaultModel,
		};
	}

	return { parsedNodeTypes, llm, judgeLlm, agentModels, tracer, lsClient };
}

export interface CreateAgentOptions {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel; // Keep for backward compatibility
	agentModels?: {
		supervisor?: BaseChatModel;
		responder?: BaseChatModel;
		discovery?: BaseChatModel;
		builder?: BaseChatModel;
		configurator?: BaseChatModel;
		default: BaseChatModel;
	};
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
	const { parsedNodeTypes, llm, agentModels, tracer, featureFlags, experimentName } = options;

	// Use agentModels if provided, otherwise fall back to single llm for backward compatibility
	const defaultModel = agentModels?.default ?? llm;

	return new WorkflowBuilderAgent({
		parsedNodeTypes,
		llmSimpleTask: defaultModel,
		llmComplexTask: defaultModel,
		agentModels,
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
