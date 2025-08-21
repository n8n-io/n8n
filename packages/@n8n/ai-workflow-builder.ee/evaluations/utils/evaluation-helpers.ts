import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { mkdirSync, writeFileSync } from 'fs';
import { Client } from 'langsmith';
import type { INodeTypeDescription } from 'n8n-workflow';
import { join } from 'path';
import pc from 'picocolors';

import { anthropicClaudeSonnet4 } from '../../src/llm-config.js';
import { WorkflowBuilderAgent } from '../../src/workflow-builder-agent.js';
import type { Violation } from '../types/evaluation.js';
import type { TestResult } from '../types/test-result.js';

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
		const typeFormatted = formatViolationType(v.type);
		console.log(
			`  ${typeFormatted} [${v.category}] ${v.description} ${pc.dim(`(-${v.pointsDeducted} pts)`)}`,
		);
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

/**
 * Formats a score with appropriate color based on value
 * @param score - Score between 0 and 1
 * @param asPercentage - Whether to format as percentage
 * @returns Color-formatted score string
 */
export function formatColoredScore(score: number, asPercentage = true): string {
	const value = asPercentage ? formatPercentage(score) : score.toFixed(2);
	if (score >= 0.8) return pc.green(value);
	if (score >= 0.5) return pc.yellow(value);
	return pc.red(value);
}

/**
 * Creates a formatted section header
 * @param title - Header title
 * @param width - Total width of the header line
 * @returns Formatted header string
 */
export function formatHeader(title: string, width = 60): string {
	const padding = Math.max(0, width - title.length - 4);
	const leftPad = Math.floor(padding / 2);
	const rightPad = padding - leftPad;
	return pc.blue('═'.repeat(leftPad) + ` ${title} ` + '═'.repeat(rightPad));
}

/**
 * Formats a status badge with appropriate icon and color
 * @param status - Status type
 * @returns Formatted status badge
 */
export function formatStatusBadge(status: 'pass' | 'fail' | 'running' | 'pending'): string {
	switch (status) {
		case 'pass':
			return pc.green('✓ PASS');
		case 'fail':
			return pc.red('✗ FAIL');
		case 'running':
			return pc.blue('⚡ RUNNING');
		case 'pending':
			return pc.gray('○ PENDING');
	}
}

/**
 * Formats violation type with appropriate color
 * @param type - Violation type
 * @returns Color-formatted violation type
 */
export function formatViolationType(type: 'critical' | 'major' | 'minor'): string {
	switch (type) {
		case 'critical':
			return pc.red('[CRITICAL]');
		case 'major':
			return pc.yellow('[MAJOR]');
		case 'minor':
			return pc.gray('[MINOR]');
	}
}

/**
 * Formats a test name with dimmed ID
 * @param name - Test name
 * @param id - Test ID
 * @returns Formatted test name
 */
export function formatTestName(name: string, id: string): string {
	return `${name} ${pc.dim(`(${id})`)}`;
}

/**
 * Collects all violations from test results with their test context
 * @param results - Array of test results
 * @returns Array of violations with test name and category
 */
export function collectAllViolations(results: TestResult[]): Array<{
	violation: Violation & { category: string };
	testName: string;
}> {
	const allViolations: Array<{
		violation: Violation & { category: string };
		testName: string;
	}> = [];

	results.forEach((result) => {
		if (!result.error) {
			const testViolations = [
				...result.evaluationResult.functionality.violations.map((v) => ({
					violation: { ...v, category: 'Functionality' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.connections.violations.map((v) => ({
					violation: { ...v, category: 'Connections' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.expressions.violations.map((v) => ({
					violation: { ...v, category: 'Expressions' },
					testName: result.testCase.name,
				})),
				...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
					violation: { ...v, category: 'Node Config' },
					testName: result.testCase.name,
				})),
			];
			allViolations.push.apply(allViolations, testViolations);
		}
	});

	return allViolations;
}

/**
 * Saves evaluation results to disk in both JSON and markdown formats
 * @param results - Array of test results
 * @param report - Generated markdown report
 * @returns Paths to saved files
 */
export function saveEvaluationResults(
	results: TestResult[],
	report: string,
): { reportPath: string; resultsPath: string } {
	const resultsDir = join(process.cwd(), 'evaluations', 'results');
	mkdirSync(resultsDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/:/g, '-');
	const reportPath = join(resultsDir, `evaluation-report-${timestamp}.md`);
	const resultsPath = join(resultsDir, `evaluation-results-${timestamp}.json`);

	writeFileSync(reportPath, report);
	writeFileSync(resultsPath, JSON.stringify(results, null, 2));

	return { reportPath, resultsPath };
}
