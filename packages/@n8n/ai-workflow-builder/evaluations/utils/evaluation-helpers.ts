import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith';
import type { INodeTypeDescription } from 'n8n-workflow';

import { anthropicClaudeSonnet4 } from '../../src/llm-config.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import type { Violation } from '../types/evaluation.js';

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
 * Groups violations by category for display
 * @param violations - Array of violations with category information
 * @returns Grouped violations by severity type
 */
export function groupViolationsBySeverity(violations: Array<Violation & { category: string }>): {
	critical: Array<Violation & { category: string }>;
	major: Array<Violation & { category: string }>;
	minor: Array<Violation & { category: string }>;
} {
	return {
		critical: violations.filter((v) => v.type === 'critical'),
		major: violations.filter((v) => v.type === 'major'),
		minor: violations.filter((v) => v.type === 'minor'),
	};
}

/**
 * Formats violations for console display
 * @param violations - Array of violations to format
 * @param title - Section title
 */
export function displayViolationSection(
	violations: Array<Violation & { category: string }>,
	title: string,
): void {
	if (violations.length === 0) return;

	console.log(`\n${title}:`);
	violations.forEach((v) => {
		console.log(`  - [${v.category}] ${v.description} (-${v.pointsDeducted} points)`);
	});
}

/**
 * Logs progress dots during long-running operations
 * @param count - Current iteration count
 * @param interval - How often to print a dot (default: 10)
 */
export function logProgress(count: number, interval: number = 10): void {
	if (count % interval === 0) {
		process.stdout.write('.');
	}
}

/**
 * Formats percentage for display
 * @param value - Decimal value between 0 and 1
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculates elapsed time and formats it for display
 * @param startTime - Start timestamp from Date.now()
 * @returns Formatted time string
 */
export function formatElapsedTime(startTime: number): string {
	const elapsed = Date.now() - startTime;
	if (elapsed < 1000) {
		return `${elapsed}ms`;
	}
	return `${(elapsed / 1000).toFixed(1)}s`;
}
