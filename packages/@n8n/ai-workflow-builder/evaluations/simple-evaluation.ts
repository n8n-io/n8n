import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Client } from 'langsmith';

import type { WorkflowState } from '@/workflow-state.js';

import { loadNodesFromFile, getNodeVersion } from './load-nodes.js';
import { anthropicClaudeSonnet4 } from '../src/llm-config.js';
import { WorkflowBuilderAgent, type ChatPayload } from '../src/workflow-builder-agent.js';
import { basicTestCases } from './chains/test-case-generator.js';
import { evaluateWorkflow } from './chains/workflow-evaluator.js';
import type { EvaluationInput, Violation } from './types/evaluation.js';

async function setupLLM(): Promise<BaseChatModel> {
	// Use the same LLM configuration as in the service
	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY;
	if (!apiKey) {
		throw new Error('N8N_AI_ANTHROPIC_KEY environment variable is required');
	}

	console.log('Initializing LLM...');
	return await anthropicClaudeSonnet4({ apiKey });
}

async function runEvaluation() {
	console.log('=== AI Workflow Builder Evaluation ===\n');

	try {
		// Load nodes from file
		const parsedNodeTypes = loadNodesFromFile();

		// Log some specific node versions for verification
		console.log('\n=== Version Verification ===');
		const testNodes = [
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.set',
			'n8n-nodes-base.if',
			'n8n-nodes-base.airtable',
			'@n8n/n8n-nodes-langchain.agent',
		];

		for (const nodeName of testNodes) {
			console.log(`${nodeName}: version ${getNodeVersion(parsedNodeTypes, nodeName)}`);
		}

		// Setup LLM
		const llm = await setupLLM();

		// Create checkpointer for state persistence
		const checkpointer = new MemorySaver();

		// Initialize the agent
		console.log('\n=== Initializing Agent ===');

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

		console.log('Agent initialized successfully');

		// Test workflow generation with evaluation
		console.log('\n=== Testing Workflow Generation ===');

		// Use the first basic test case
		const testCase = basicTestCases[0];
		console.log(`Test Case: ${testCase.name}`);
		console.log(`Description: ${testCase.description}`);
		console.log(`Complexity: ${testCase.complexity}`);
		console.log(`Prompt: "${testCase.prompt}"`);

		const workflowId = testCase.id;
		const userId = 'test-user';

		const chatPayload: ChatPayload = {
			question: testCase.prompt,
			workflowId,
			// @ts-ignore
			executionData: {},
		};

		console.log('\nGenerating workflow...');

		// Process the chat stream
		let messageCount = 0;
		const startTime = Date.now();
		for await (const _output of agent.chat(chatPayload, userId)) {
			messageCount++;
			if (messageCount % 10 === 0) {
				process.stdout.write('.');
			}
		}
		const generationTime = Date.now() - startTime;

		console.log(`\n\nProcessed ${messageCount} stream messages in ${generationTime}ms`);

		// Get the final state from sessions
		console.log('\n=== Retrieving Final State ===');
		const state = await agent.getState(workflowId, userId);
		const generatedWorkflow = (state.values as typeof WorkflowState.State).workflowJSON;

		console.log(`Generated workflow has ${generatedWorkflow.nodes.length} nodes`);
		console.log('Node types:', generatedWorkflow.nodes.map((n) => n.type).join(', '));

		// Evaluate the generated workflow
		console.log('\n=== Evaluating Generated Workflow ===');
		const evaluationInput: EvaluationInput = {
			userPrompt: testCase.prompt,
			generatedWorkflow,
			// No reference workflow for this basic test
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

		// Display evaluation results
		console.log('\n=== Evaluation Results ===');
		console.log(`Overall Score: ${(evaluationResult.overallScore * 100).toFixed(1)}%`);
		console.log('\nCategory Scores:');
		console.log(`  - Functionality: ${(evaluationResult.functionality.score * 100).toFixed(1)}%`);
		console.log(`  - Connections: ${(evaluationResult.connections.score * 100).toFixed(1)}%`);
		console.log(`  - Expressions: ${(evaluationResult.expressions.score * 100).toFixed(1)}%`);
		console.log(
			`  - Node Configuration: ${(evaluationResult.nodeConfiguration.score * 100).toFixed(1)}%`,
		);

		if (evaluationResult.structuralSimilarity.applicable) {
			console.log(
				`  - Structural Similarity: ${(evaluationResult.structuralSimilarity.score * 100).toFixed(1)}%`,
			);
		}

		// Display violations
		const allViolations: Array<Violation & { category: string }> = [
			...evaluationResult.functionality.violations.map((v: Violation) => ({
				...v,
				category: 'Functionality',
			})),
			...evaluationResult.connections.violations.map((v: Violation) => ({
				...v,
				category: 'Connections',
			})),
			...evaluationResult.expressions.violations.map((v: Violation) => ({
				...v,
				category: 'Expressions',
			})),
			...evaluationResult.nodeConfiguration.violations.map((v: Violation) => ({
				...v,
				category: 'Node Configuration',
			})),
		];

		if (allViolations.length > 0) {
			console.log('\n=== Violations Found ===');
			const criticalViolations = allViolations.filter((v) => v.type === 'critical');
			const majorViolations = allViolations.filter((v) => v.type === 'major');
			const minorViolations = allViolations.filter((v) => v.type === 'minor');

			if (criticalViolations.length > 0) {
				console.log('\nCritical Violations:');
				criticalViolations.forEach((v) => {
					console.log(`  - [${v.category}] ${v.description} (-${v.pointsDeducted} points)`);
				});
			}

			if (majorViolations.length > 0) {
				console.log('\nMajor Violations:');
				majorViolations.forEach((v) => {
					console.log(`  - [${v.category}] ${v.description} (-${v.pointsDeducted} points)`);
				});
			}

			if (minorViolations.length > 0) {
				console.log('\nMinor Violations:');
				minorViolations.forEach((v) => {
					console.log(`  - [${v.category}] ${v.description} (-${v.pointsDeducted} points)`);
				});
			}
		}

		if (evaluationResult.criticalIssues.length > 0) {
			console.log('\n=== Critical Issues ===');
			evaluationResult.criticalIssues.forEach((issue: string) => {
				console.log(`  - ${issue}`);
			});
		}

		console.log('\n=== Summary ===');
		console.log(evaluationResult.summary);

		// Save results for analysis
		console.log('\n=== Generated Workflow JSON ===');
		console.log(JSON.stringify(generatedWorkflow, null, 2));

		console.log('\n=== Evaluation Complete ===');
	} catch (error) {
		console.error('Evaluation failed:', error);
		process.exit(1);
	}
}

// Run the evaluation
runEvaluation().catch(console.error);
