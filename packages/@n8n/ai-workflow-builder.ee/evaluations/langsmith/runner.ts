import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { evaluate } from 'langsmith/evaluation';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';
import pc from 'picocolors';

import { createLangsmithEvaluator } from './evaluator';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import type { WorkflowState } from '../../src/workflow-state';
import { EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants';
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
 * Uses traceable wrapper for proper LangSmith context propagation
 * @param parsedNodeTypes - Node types
 * @param llm - Language model
 * @param featureFlags - Optional feature flags to pass to the agent
 * @returns Function that generates workflows from inputs
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	featureFlags?: BuilderFeatureFlags,
) {
	// Wrap the inner function with traceable for proper LangSmith context propagation
	const generateWorkflow = traceable(
		async (inputs: typeof WorkflowState.State) => {
			// Generate a unique ID for this evaluation run
			const runId = generateRunId();

			// Validate inputs
			if (!inputs.messages || !Array.isArray(inputs.messages) || inputs.messages.length === 0) {
				throw new Error('No messages provided in inputs');
			}

			// Extract first message content safely
			const firstMessage = inputs.messages[0];
			const messageContent = extractMessageContent(firstMessage);

			// Get LangChain callbacks linked to current traceable context.
			// This is the official bridge between LangSmith's traceable and LangChain callbacks.
			const callbacks = await getLangchainCallbacks();

			// Create agent for this run (no tracer - callbacks passed at invocation)
			const agent = createAgent({ parsedNodeTypes, llm, featureFlags });
			await consumeGenerator(
				agent.chat(
					getChatPayload({
						evalType: EVAL_TYPES.LANGSMITH,
						message: messageContent,
						workflowId: runId,
						featureFlags,
					}),
					EVAL_USERS.LANGSMITH,
					undefined, // abortSignal
					callbacks, // externalCallbacks for LangSmith tracing
				),
			);

			// Get generated workflow with validation
			const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

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
		},
		{ name: TRACEABLE_NAMES.WORKFLOW_GENERATION, run_type: 'chain' },
	);

	return generateWorkflow;
}

/**
 * Runs evaluation using Langsmith
 * @param repetitions - Number of times to run each example (default: 1)
 * @param featureFlags - Optional feature flags to pass to the agent
 */
export async function runLangsmithEvaluation(
	repetitions: number = 1,
	featureFlags?: BuilderFeatureFlags,
): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Langsmith Evaluation', 70));
	if (repetitions > 1) {
		console.log(pc.yellow(`➔ Each example will be run ${repetitions} times`));
	}
	if (featureFlags) {
		const enabledFlags = Object.entries(featureFlags)
			.filter(([, v]) => v === true)
			.map(([k]) => k);
		if (enabledFlags.length > 0) {
			console.log(pc.green(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`));
		}
	}
	console.log();

	try {
		// Check for Langsmith API key
		if (!process.env.LANGSMITH_API_KEY) {
			throw new Error('LANGSMITH_API_KEY environment variable not set');
		}

		// Setup test environment
		const { parsedNodeTypes, llm, lsClient } = await setupTestEnvironment();
		// Note: Don't use the tracer from setupTestEnvironment() here.
		// LangSmith's evaluate() manages its own tracing context - passing a separate
		// tracer would create disconnected runs in a different project.

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		// Get dataset name from env or use default
		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
		console.log(pc.blue(`➔ Using dataset: ${datasetName}`));

		// Verify dataset exists
		try {
			await lsClient.readDataset({ datasetName });
		} catch {
			// List available datasets for helpful error message
			const availableDatasets: string[] = [];
			for await (const dataset of lsClient.listDatasets()) {
				availableDatasets.push(`${dataset.name} (${dataset.id})`);
			}

			throw new Error(
				`Dataset "${datasetName}" not found. Available datasets: ${availableDatasets.join(', ') || 'none'}. ` +
					'Set LANGSMITH_DATASET_NAME environment variable to use a different dataset.',
			);
		}

		console.log();
		const startTime = Date.now();

		// Create workflow generation function
		// Uses traceable wrapper internally for proper LangSmith context propagation
		const generateWorkflow = createWorkflowGenerator(parsedNodeTypes, llm, featureFlags);

		// Create evaluator with both LLM-based and programmatic evaluation
		const evaluator = createLangsmithEvaluator(llm, parsedNodeTypes);

		// Run Langsmith evaluation
		const results = await evaluate(generateWorkflow, {
			data: datasetName,
			evaluators: [evaluator],
			maxConcurrency: 7,
			experimentPrefix: 'workflow-builder-evaluation',
			numRepetitions: repetitions,
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
