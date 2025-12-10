import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import { createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';

// ============================================================================
// Types
// ============================================================================

export interface PairwiseDatasetInput {
	evals: {
		dos: string;
		donts: string;
	};
	prompt: string;
}

export interface PairwiseGeneratorOutput {
	workflow: SimpleWorkflow;
	prompt: string;
}

// ============================================================================
// Generator Factory
// ============================================================================

/**
 * Creates a workflow generator function for LangSmith evaluation.
 * The generator only produces workflows - evaluation is done by the evaluator.
 *
 * Uses traceable wrapper for proper LangSmith context propagation.
 *
 * @param parsedNodeTypes - Available node types
 * @param llm - Language model for generation
 * @param featureFlags - Optional feature flags
 * @param runName - Optional run name prefix
 * @returns Target function for LangSmith evaluate()
 */
export function createPairwiseGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	featureFlags?: BuilderFeatureFlags,
	runName?: string,
) {
	// Wrap with traceable for proper LangSmith context propagation
	const generateWorkflow = traceable(
		async (inputs: PairwiseDatasetInput): Promise<PairwiseGeneratorOutput> => {
			const runId = generateRunId();

			// Get LangChain callbacks linked to current traceable context
			// This is the official bridge between LangSmith's traceable and LangChain callbacks
			const callbacks = await getLangchainCallbacks();

			// Create agent for this run
			const agent = createAgent(parsedNodeTypes, llm, undefined, featureFlags, runName);

			// Generate workflow - pass callbacks for proper trace linking
			await consumeGenerator(
				agent.chat(
					getChatPayload('pairwise-gen', inputs.prompt, runId, featureFlags),
					'pairwise-gen-user',
					undefined, // abortSignal
					callbacks, // externalCallbacks for LangSmith tracing
				),
			);

			// Get generated workflow
			const state = await agent.getState(runId, 'pairwise-gen-user');

			if (!state.values || !isWorkflowStateValues(state.values)) {
				throw new Error('Invalid workflow state: workflow or messages missing');
			}

			return {
				workflow: state.values.workflowJSON,
				prompt: inputs.prompt,
			};
		},
		{ name: 'pairwise_workflow_generation', run_type: 'chain' },
	);

	return generateWorkflow;
}

/**
 * Generate a single workflow without LangSmith tracing.
 * Used for local evaluation mode.
 */
export async function generateWorkflowLocal(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	prompt: string,
	featureFlags?: BuilderFeatureFlags,
): Promise<SimpleWorkflow> {
	const runId = generateRunId();

	const agent = createAgent(parsedNodeTypes, llm, undefined, featureFlags);

	await consumeGenerator(
		agent.chat(
			getChatPayload('pairwise-local', prompt, runId, featureFlags),
			'pairwise-local-user',
		),
	);

	const state = await agent.getState(runId, 'pairwise-local-user');

	if (!state.values || !isWorkflowStateValues(state.values)) {
		throw new Error('Invalid workflow state: workflow or messages missing');
	}

	return state.values.workflowJSON;
}
