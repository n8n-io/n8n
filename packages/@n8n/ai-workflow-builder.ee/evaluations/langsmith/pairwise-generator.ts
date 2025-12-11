import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';

import { buildSingleGenerationResults, buildMultiGenerationResults } from './pairwise-ls-evaluator';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import { EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants';
import { createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import type { PairwiseDatasetInput, PairwiseTargetOutput } from '../types/pairwise';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';
import { runJudgePanel, aggregateGenerations, type GenerationResult } from '../utils/judge-panel';

export type { PairwiseDatasetInput, PairwiseTargetOutput };

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
			const { prompt, evals: evalCriteria, notion_id: notionId } = inputs;

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
								...(notionId && { notion_id: notionId }),
							},
						},
					);
					const workflow = await generate();
					const panelResult = await runJudgePanel(llm, workflow, evalCriteria, numJudges, {
						generationIndex,
						experimentName,
						notionId,
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
		{ name: TRACEABLE_NAMES.PAIRWISE_EVALUATION, run_type: 'chain' },
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
			getChatPayload(EVAL_TYPES.PAIRWISE_LOCAL, prompt, runId, featureFlags),
			EVAL_USERS.PAIRWISE_LOCAL,
		),
	);

	const state = await agent.getState(runId, EVAL_USERS.PAIRWISE_LOCAL);

	if (!state.values || !isWorkflowStateValues(state.values)) {
		throw new Error('Invalid workflow state: workflow or messages missing');
	}

	return state.values.workflowJSON;
}
