import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { evaluate } from 'langsmith/evaluation';
import type { INodeTypeDescription } from 'n8n-workflow';
import pc from 'picocolors';

import { createLangsmithEvaluator } from './evaluator';
import type { WorkflowState } from '../../src/workflow-state';
import { setupTestEnvironment, createAgent } from '../core/environment';
import {
	generateRunId,
	safeExtractUsage,
	isWorkflowStateValues,
	extractMessageContent,
} from '../types/langsmith';
import { consumeGenerator, formatHeader, getChatPayload } from '../utils/evaluation-helpers';

/**
 * Creates a workflow generation function for Langsmith evaluation
 * @param parsedNodeTypes - Node types
 * @param llm - Language model
 * @param tracer - Optional tracer
 * @returns Function that generates workflows from inputs
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	tracer?: LangChainTracer,
) {
	return async (inputs: typeof WorkflowState.State) => {
		// Generate a unique ID for this evaluation run
		const runId = generateRunId();

		// Validate inputs
		if (!inputs.messages || !Array.isArray(inputs.messages) || inputs.messages.length === 0) {
			throw new Error('No messages provided in inputs');
		}

		// Extract first message content safely
		const firstMessage = inputs.messages[0];
		const messageContent = extractMessageContent(firstMessage);

		// Create agent for this run
		const agent = createAgent(parsedNodeTypes, llm, tracer);
		await consumeGenerator(
			agent.chat(getChatPayload(messageContent, runId), 'langsmith-eval-user'),
		);

		// Get generated workflow with validation
		const state = await agent.getState(runId, 'langsmith-eval-user');

		// Validate state
		if (!state.values) {
			throw new Error('No values in agent state');
		}

		if (!isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: workflow or messages missing');
		}

		const generatedWorkflow = state.values.workflowJSON;
		const messages = state.values.messages;

		// Extract usage metadata safely
		const usage = safeExtractUsage(messages);

		return {
			workflow: generatedWorkflow,
			prompt: messageContent,
			usage,
		};
	};
}

/**
 * Runs evaluation using Langsmith
 */
export async function runLangsmithEvaluation(): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Langsmith Evaluation', 70));
	console.log();

	// Check for Langsmith API key
	if (!process.env.LANGSMITH_API_KEY) {
		console.error(pc.red('✗ LANGSMITH_API_KEY environment variable not set'));
		process.exit(1);
	}

	try {
		// Setup test environment
		const { parsedNodeTypes, llm, tracer, lsClient } = await setupTestEnvironment();

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		// Get dataset name from env or use default
		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
		console.log(pc.blue(`➔ Using dataset: ${datasetName}`));

		// Verify dataset exists
		try {
			await lsClient.readDataset({ datasetName });
		} catch (error) {
			console.error(pc.red(`✗ Dataset "${datasetName}" not found`));
			console.log('\nAvailable datasets:');

			// List available datasets
			for await (const dataset of lsClient.listDatasets()) {
				console.log(pc.dim(`  - ${dataset.name} (${dataset.id})`));
			}

			console.log(
				'\nTo use a different dataset, set the LANGSMITH_DATASET_NAME environment variable',
			);
			process.exit(1);
		}

		console.log();
		const startTime = Date.now();

		// Create workflow generation function
		const generateWorkflow = createWorkflowGenerator(parsedNodeTypes, llm, tracer);

		// Create evaluator with both LLM-based and programmatic evaluation
		const evaluator = createLangsmithEvaluator(llm, parsedNodeTypes);

		// Run Langsmith evaluation
		const results = await evaluate(generateWorkflow, {
			data: datasetName,
			evaluators: [evaluator],
			maxConcurrency: 7,
			experimentPrefix: 'workflow-builder-evaluation',
			metadata: {
				evaluationType: 'llm-based',
				modelName: process.env.LLM_MODEL ?? 'default',
			},
		});

		const totalTime = Date.now() - startTime;
		console.log(pc.green(`✓ Evaluation completed in ${(totalTime / 1000).toFixed(1)}s`));

		// Display results information
		console.log('\nView detailed results in Langsmith dashboard');
		console.log(
			`Experiment name: workflow-builder-evaluation-${new Date().toISOString().split('T')[0]}`,
		);

		// Log summary of results if available
		if (results) {
			console.log(pc.dim('Evaluation run completed successfully'));
			console.log(pc.dim(`Dataset: ${datasetName}`));
		}
	} catch (error) {
		console.error(pc.red('✗ Langsmith evaluation failed:'), error);
		process.exit(1);
	}
}
