import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { writeFileSync } from 'fs';
import { Client } from 'langsmith';
import { join } from 'path';

import type { WorkflowState } from '@/workflow-state.js';

import { loadNodesFromFile } from './load-nodes.js';
import { anthropicClaudeSonnet4 } from '../src/llm-config.js';
import { WorkflowBuilderAgent, type ChatPayload } from '../src/workflow-builder-agent.js';
import { basicTestCases, generateTestCases } from './chains/test-case-generator.js';
import { evaluateWorkflow } from './chains/workflow-evaluator.js';
import type { EvaluationInput, TestCase, EvaluationResult } from './types/evaluation.js';
import type { SimpleWorkflow } from '../src/types/workflow';

interface TestResult {
	testCase: TestCase;
	generatedWorkflow: SimpleWorkflow;
	evaluationResult: EvaluationResult;
	generationTime: number;
	error?: string;
}

async function setupLLM(): Promise<BaseChatModel> {
	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY;
	if (!apiKey) {
		throw new Error('N8N_AI_ANTHROPIC_KEY environment variable is required');
	}
	return await anthropicClaudeSonnet4({ apiKey });
}

async function runTestCase(
	agent: WorkflowBuilderAgent,
	llm: BaseChatModel,
	testCase: TestCase,
	userId: string = 'test-user',
): Promise<TestResult> {
	console.log(`\n[${testCase.id}] Running test: ${testCase.name}`);
	console.log(`  Prompt: "${testCase.prompt}"`);

	try {
		const chatPayload: ChatPayload = {
			question: testCase.prompt,
			workflowId: testCase.id,
			// @ts-ignore
			executionData: {},
		};

		// Generate workflow
		const startTime = Date.now();
		let messageCount = 0;
		for await (const _output of agent.chat(chatPayload, userId)) {
			messageCount++;
			if (messageCount % 10 === 0) {
				process.stdout.write('.');
			}
		}
		const generationTime = Date.now() - startTime;
		console.log(` Done (${messageCount} messages in ${generationTime}ms)`);

		// Get generated workflow
		const state = await agent.getState(testCase.id, userId);
		const generatedWorkflow = (state.values as typeof WorkflowState.State).workflowJSON;

		// Evaluate
		const evaluationInput: EvaluationInput = {
			userPrompt: testCase.prompt,
			generatedWorkflow,
			referenceWorkflow: testCase.referenceWorkflow,
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

		console.log(`  Score: ${(evaluationResult.overallScore * 100).toFixed(1)}%`);
		console.log(
			`  Nodes: ${generatedWorkflow.nodes.length} (${generatedWorkflow.nodes.map((n) => n.type).join(', ')})`,
		);

		return {
			testCase,
			generatedWorkflow,
			evaluationResult,
			generationTime,
		};
	} catch (error) {
		console.error(`  Error: ${error}`);
		return {
			testCase,
			generatedWorkflow: { nodes: [], connections: {} },
			evaluationResult: {
				overallScore: 0,
				functionality: { score: 0, violations: [] },
				connections: { score: 0, violations: [] },
				expressions: { score: 0, violations: [] },
				nodeConfiguration: { score: 0, violations: [] },
				structuralSimilarity: { score: 0, violations: [], applicable: false },
				summary: 'Evaluation failed due to error',
				criticalIssues: [`Error: ${error}`],
			} as EvaluationResult,
			generationTime: 0,
			error: String(error),
		};
	}
}

function generateReport(results: TestResult[]): string {
	const totalTests = results.length;
	const successfulTests = results.filter((r) => !r.error).length;
	const averageScore =
		results.filter((r) => !r.error).reduce((sum, r) => sum + r.evaluationResult.overallScore, 0) /
			successfulTests || 0;

	const categoryAverages = {
		functionality: 0,
		connections: 0,
		expressions: 0,
		nodeConfiguration: 0,
	};

	results
		.filter((r) => !r.error)
		.forEach((r) => {
			categoryAverages.functionality += r.evaluationResult.functionality.score;
			categoryAverages.connections += r.evaluationResult.connections.score;
			categoryAverages.expressions += r.evaluationResult.expressions.score;
			categoryAverages.nodeConfiguration += r.evaluationResult.nodeConfiguration.score;
		});

	Object.keys(categoryAverages).forEach((key) => {
		categoryAverages[key as keyof typeof categoryAverages] /= successfulTests || 1;
	});

	// Count violations by type
	let criticalCount = 0;
	let majorCount = 0;
	let minorCount = 0;

	results.forEach((r) => {
		const allViolations = [
			...r.evaluationResult.functionality.violations,
			...r.evaluationResult.connections.violations,
			...r.evaluationResult.expressions.violations,
			...r.evaluationResult.nodeConfiguration.violations,
		];
		criticalCount += allViolations.filter((v) => v.type === 'critical').length;
		majorCount += allViolations.filter((v) => v.type === 'major').length;
		minorCount += allViolations.filter((v) => v.type === 'minor').length;
	});

	let report = `# AI Workflow Builder Evaluation Report

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${totalTests - successfulTests}
- Average Score: ${(averageScore * 100).toFixed(1)}%

## Category Averages
- Functionality: ${(categoryAverages.functionality * 100).toFixed(1)}%
- Connections: ${(categoryAverages.connections * 100).toFixed(1)}%
- Expressions: ${(categoryAverages.expressions * 100).toFixed(1)}%
- Node Configuration: ${(categoryAverages.nodeConfiguration * 100).toFixed(1)}%

## Violations Summary
- Critical: ${criticalCount}
- Major: ${majorCount}
- Minor: ${minorCount}

## Detailed Results

`;

	results.forEach((result) => {
		report += `### ${result.testCase.name} (${result.testCase.id})
- **Score**: ${(result.evaluationResult.overallScore * 100).toFixed(1)}%
- **Generation Time**: ${result.generationTime}ms
- **Nodes Generated**: ${result.generatedWorkflow.nodes.length}
- **Summary**: ${result.evaluationResult.summary}

`;

		if (result.evaluationResult.criticalIssues.length > 0) {
			report += '**Critical Issues**:\n';
			result.evaluationResult.criticalIssues.forEach((issue) => {
				report += `- ${issue}\n`;
			});
			report += '\n';
		}

		const allViolations = [
			...result.evaluationResult.functionality.violations.map((v) => ({
				...v,
				category: 'Functionality',
			})),
			...result.evaluationResult.connections.violations.map((v) => ({
				...v,
				category: 'Connections',
			})),
			...result.evaluationResult.expressions.violations.map((v) => ({
				...v,
				category: 'Expressions',
			})),
			...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
				...v,
				category: 'Node Configuration',
			})),
		];

		if (allViolations.length > 0) {
			report += '**Violations**:\n';
			allViolations.forEach((v) => {
				report += `- [${v.type.toUpperCase()}] ${v.category}: ${v.description}\n`;
			});
			report += '\n';
		}
	});

	return report;
}

async function runFullEvaluation() {
	console.log('=== AI Workflow Builder Full Evaluation ===\n');

	try {
		// Setup
		const parsedNodeTypes = loadNodesFromFile();
		const llm = await setupLLM();
		const checkpointer = new MemorySaver();

		const tracingClient = new Client({
			apiKey: process.env.LANGSMITH_API_KEY,
		});
		const tracer = new LangChainTracer({
			client: tracingClient,
			projectName: 'workflow-builder-evaluation',
		});

		const agent = new WorkflowBuilderAgent({
			parsedNodeTypes,
			llmSimpleTask: llm,
			llmComplexTask: llm,
			checkpointer,
			tracer,
		});

		// Determine test cases to run
		let testCases: TestCase[] = basicTestCases;

		// Optionally generate additional test cases
		if (process.env.GENERATE_TEST_CASES === 'true') {
			console.log('Generating additional test cases...');
			const generatedCases = await generateTestCases(llm, 2);
			testCases = [...testCases, ...generatedCases];
		}

		console.log(`Running ${testCases.length} test cases...\n`);

		// Run all test cases
		const results: TestResult[] = [];
		for (const testCase of testCases) {
			const result = await runTestCase(agent, llm, testCase);
			results.push(result);
		}

		// Generate and save report
		const report = generateReport(results);
		const reportPath = join(__dirname, `results/evaluation-report-${new Date().toISOString()}.md`);
		writeFileSync(reportPath, report);
		console.log(`\nReport saved to: ${reportPath}`);

		// Save detailed results as JSON
		const resultsPath = join(
			__dirname,
			`results/evaluation-results-${new Date().toISOString()}.json`,
		);
		writeFileSync(resultsPath, JSON.stringify(results, null, 2));
		console.log(`Detailed results saved to: ${resultsPath}`);

		// Print summary
		console.log('\n=== Evaluation Summary ===');
		console.log(report.split('## Detailed Results')[0]);
	} catch (error) {
		console.error('Evaluation failed:', error);
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	runFullEvaluation().catch(console.error);
}

export { runFullEvaluation, runTestCase };
