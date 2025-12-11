import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';

import { buildSingleGenerationResults, buildMultiGenerationResults } from './pairwise-ls-evaluator';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import { createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';
import {
	runJudgePanel,
	aggregateGenerations,
	type GenerationResult,
	type EvalCriteria,
} from '../utils/judge-panel';

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

export interface PairwiseTargetOutput {
	prompt: string;
	evals: EvalCriteria;
	/** Pre-computed feedback results. Named with underscore to avoid LangSmith auto-processing */
	_feedback: LangsmithEvaluationResult[];
}

// ============================================================================
// Target Factory
// ============================================================================

/**
 * Creates a target function that does ALL the work:
 * - Generates all workflows (each wrapped in traceable)
 * - Runs judge panels
 * - Returns pre-computed feedback
 *
 * The evaluator then just extracts the pre-computed feedback.
 * This avoids 403 errors from nested traceable in evaluator context.
 */
export function createPairwiseTarget(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	numJudges: number,
	numGenerations: number,
	featureFlags?: BuilderFeatureFlags,
	experimentName?: string,
) {
	return traceable(
		async (inputs: PairwiseDatasetInput): Promise<PairwiseTargetOutput> => {
			const { prompt, evals: evalCriteria } = inputs;

			// Generate ALL workflows and run judges in parallel
			const generationResults: GenerationResult[] = await Promise.all(
				Array.from({ length: numGenerations }, async (_, i) => {
					const generationIndex = i + 1;
					// Wrap each generation in traceable for proper visibility
					const generate = traceable(
						async () => await generateWorkflow(parsedNodeTypes, llm, prompt, featureFlags),
						{
							name: `generation_${generationIndex}`,
							run_type: 'chain',
							metadata: {
								...(experimentName && { experiment_name: experimentName }),
							},
						},
					);
					const workflow = await generate();
					const panelResult = await runJudgePanel(llm, workflow, evalCriteria, numJudges, {
						generationIndex,
						experimentName,
					});
					return { workflow, ...panelResult };
				}),
			);

			if (numGenerations === 1) {
				const result = generationResults[0];
				const singleGenFeedback: LangsmithEvaluationResult[] = buildSingleGenerationResults(
					result.judgeResults,
					numJudges,
					result.primaryPasses,
					result.majorityPass,
					result.avgDiagnosticScore,
				);

				return { prompt, evals: evalCriteria, _feedback: singleGenFeedback };
			}

			const aggregation = aggregateGenerations(generationResults);
			const multiGenFeedback: LangsmithEvaluationResult[] = buildMultiGenerationResults(
				aggregation,
				numJudges,
			);

			return { prompt, evals: evalCriteria, _feedback: multiGenFeedback };
		},
		{ name: 'pairwise_evaluation', run_type: 'chain' },
	);
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
