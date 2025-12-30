import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';

import { runJudgePanel, aggregateGenerations, type GenerationResult } from './judge-panel';
import { buildSingleGenerationResults, buildMultiGenerationResults } from './metrics-builder';
import type { PairwiseDatasetInput, PairwiseTargetOutput } from './types';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags, ModelOverrides } from '../../src/workflow-builder-agent';
import { EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants';
import { createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';

// ============================================================================
// Target Factory
// ============================================================================

export interface CreatePairwiseTargetOptions {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	/** Model to use for judging (defaults to llm) */
	judgeLlm?: BaseChatModel;
	/** Per-stage model overrides for generation */
	modelOverrides?: ModelOverrides;
	/** Tracer for LangSmith tracing (with filtering) */
	tracer?: LangChainTracer;
	numJudges: number;
	numGenerations: number;
	featureFlags?: BuilderFeatureFlags;
	experimentName?: string;
}

/**
 * Creates a target function that does ALL the work:
 * - Generates all workflows (each wrapped in traceable)
 * - Runs judge panels
 * - Returns pre-computed feedback
 *
 * The evaluator then just extracts the pre-computed feedback.
 * This avoids 403 errors from nested traceable in evaluator context.
 */
export function createPairwiseTarget(options: CreatePairwiseTargetOptions) {
	const {
		parsedNodeTypes,
		llm,
		judgeLlm,
		modelOverrides,
		tracer,
		numJudges,
		numGenerations,
		featureFlags,
		experimentName,
	} = options;

	// Use judgeLlm if provided, otherwise fall back to llm
	const judgeModel = judgeLlm ?? llm;

	return traceable(
		async (inputs: PairwiseDatasetInput): Promise<PairwiseTargetOutput> => {
			const { prompt, evals: evalCriteria } = inputs;

			// Generate ALL workflows and run judges in parallel
			const generationResults: GenerationResult[] = await Promise.all(
				Array.from({ length: numGenerations }, async (_, i) => {
					const generationIndex = i + 1;
					// Wrap each generation in traceable for proper visibility
					const generate = traceable(
						async () =>
							await generateWorkflow(
								parsedNodeTypes,
								llm,
								modelOverrides,
								prompt,
								featureFlags,
								tracer,
							),
						{
							name: `generation_${generationIndex}`,
							run_type: 'chain',
							metadata: {
								...(experimentName && { experiment_name: experimentName }),
							},
						},
					);
					const workflow = await generate();
					const panelResult = await runJudgePanel(judgeModel, workflow, evalCriteria, numJudges, {
						generationIndex,
						experimentName,
					});
					return { workflow, ...panelResult };
				}),
			);

			if (numGenerations === 1) {
				const singleGenFeedback = buildSingleGenerationResults(generationResults[0], numJudges);
				return { prompt, evals: evalCriteria, feedback: singleGenFeedback };
			}

			const aggregation = aggregateGenerations(generationResults);
			const multiGenFeedback: LangsmithEvaluationResult[] = buildMultiGenerationResults(
				aggregation,
				numJudges,
			);

			return { prompt, evals: evalCriteria, feedback: multiGenFeedback };
		},
		{ name: TRACEABLE_NAMES.PAIRWISE_EVALUATION, run_type: 'chain' },
	);
}

/**
 * Generate a single workflow.
 * Used for local evaluation and regeneration in multi-generation mode.
 * @param parsedNodeTypes - Available n8n node type definitions
 * @param llm - Language model for workflow generation
 * @param modelOverrides - Optional per-stage model overrides
 * @param prompt - User prompt describing the workflow to generate
 * @param featureFlags - Optional feature flags for the builder
 * @param tracer - Optional LangChain tracer for monitoring execution
 * @returns Generated workflow JSON
 */
export async function generateWorkflow(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	modelOverrides: ModelOverrides | undefined,
	prompt: string,
	featureFlags?: BuilderFeatureFlags,
	tracer?: LangChainTracer,
): Promise<SimpleWorkflow> {
	const runId = generateRunId();

	const agent = createAgent({ parsedNodeTypes, llm, modelOverrides, tracer, featureFlags });

	await consumeGenerator(
		agent.chat(
			getChatPayload({
				evalType: EVAL_TYPES.PAIRWISE_LOCAL,
				message: prompt,
				workflowId: runId,
				featureFlags,
			}),
			EVAL_USERS.PAIRWISE_LOCAL,
		),
	);

	const state = await agent.getState(runId, EVAL_USERS.PAIRWISE_LOCAL);

	if (!state.values || !isWorkflowStateValues(state.values)) {
		throw new Error('Invalid workflow state: workflow or messages missing');
	}

	return state.values.workflowJSON;
}
