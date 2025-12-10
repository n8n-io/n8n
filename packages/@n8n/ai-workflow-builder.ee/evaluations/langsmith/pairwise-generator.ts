import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
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

// ============================================================================
// Generator Factory
// ============================================================================

/**
 * Creates a pass-through target function for LangSmith evaluation.
 * All generation happens in the evaluator for consistent tracing.
 *
 * @returns Target function for LangSmith evaluate() that passes inputs through
 */
export function createPairwiseTarget() {
	return async (inputs: PairwiseDatasetInput): Promise<PairwiseDatasetInput> => {
		// Pass-through: evaluator will handle all generation
		return inputs;
	};
}

/**
 * Generate a single workflow.
 * Used for local evaluation and regeneration in multi-generation mode.
 */
export async function generateWorkflow(
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
