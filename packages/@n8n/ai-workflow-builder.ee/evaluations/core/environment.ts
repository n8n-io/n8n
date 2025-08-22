import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import { anthropicClaudeSonnet4 } from '../../src/llm-config.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import { loadNodesFromFile } from '../load-nodes.js';

export interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	tracer?: LangChainTracer;
	lsClient?: Client;
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
	return await anthropicClaudeSonnet4({ apiKey });
}

/**
 * Creates a LangChain tracer for monitoring agent execution
 * @param projectName - Name of the LangSmith project
 * @returns LangChainTracer instance or undefined if API key not provided
 */
export function createTracer(projectName: string): LangChainTracer | undefined {
	const apiKey = process.env.LANGSMITH_API_KEY;
	if (!apiKey) {
		return undefined;
	}

	const tracingClient = new Client({ apiKey });
	return new LangChainTracer({
		client: tracingClient,
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
 * @returns Test environment configuration
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();
	const llm = await setupLLM();
	const tracer = createTracer('workflow-builder-evaluation');
	const lsClient = createLangsmithClient();

	return { parsedNodeTypes, llm, tracer, lsClient };
}

/**
 * Creates a new WorkflowBuilderAgent instance
 * @param parsedNodeTypes - Array of parsed node type descriptions
 * @param llm - Language model instance
 * @param tracer - Optional LangChain tracer
 * @returns Configured WorkflowBuilderAgent
 */
export function createAgent(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	tracer?: LangChainTracer,
): WorkflowBuilderAgent {
	return new WorkflowBuilderAgent({
		parsedNodeTypes,
		llmSimpleTask: llm,
		llmComplexTask: llm,
		checkpointer: new MemorySaver(),
		tracer,
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
