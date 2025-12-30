import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';
import pc from 'picocolors';

import type { PairwiseEvaluationResult } from './judge-chain';
import {
	runJudgePanel,
	aggregateGenerations,
	type GenerationResult,
	type JudgePanelResult,
} from './judge-panel';
import { buildSingleGenerationResults, buildMultiGenerationResults } from './metrics-builder';
import type { PairwiseDatasetInput, PairwiseTargetOutput } from './types';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import { EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants';
import { createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers';
import type { EvalLogger } from '../utils/logger';

// ============================================================================
// Verbose Logging Helpers
// ============================================================================

/**
 * Create a compact summary of workflow node types.
 */
function summarizeWorkflowNodes(workflow: SimpleWorkflow): string {
	if (!workflow.nodes?.length) return '0 nodes';

	const types = workflow.nodes.map((n) =>
		n.type
			.replace('n8n-nodes-base.', '')
			.replace('@n8n/n8n-nodes-langchain.', '')
			.replace('n8n-nodes-', ''),
	);

	const counts = new Map<string, number>();
	for (const t of types) {
		counts.set(t, (counts.get(t) ?? 0) + 1);
	}

	const parts = [...counts.entries()].map(([type, count]) =>
		count > 1 ? `${type} x${count}` : type,
	);

	return `${workflow.nodes.length} nodes (${parts.join(', ')})`;
}

/**
 * Get a brief summary of a judge result.
 */
function getJudgeSummary(result: PairwiseEvaluationResult): string {
	if (result.primaryPass) {
		return 'All criteria met';
	}
	const firstViolation = result.violations[0];
	if (firstViolation) {
		const justification = firstViolation.justification.slice(0, 60);
		return justification + (firstViolation.justification.length > 60 ? '...' : '');
	}
	return 'Failed (no details)';
}

/**
 * Format timing information.
 */
function formatTiming(genTimeMs: number, panelResult: JudgePanelResult): string {
	const genSec = (genTimeMs / 1000).toFixed(1);
	if (panelResult.timing) {
		const judgeSec = (panelResult.timing.totalMs / 1000).toFixed(1);
		const avgJudgeSec = (
			panelResult.timing.perJudgeMs.reduce((a, b) => a + b, 0) /
			panelResult.timing.perJudgeMs.length /
			1000
		).toFixed(1);
		return `${genSec}s gen, ${judgeSec}s judge (${avgJudgeSec}s/judge avg)`;
	}
	return `${genSec}s gen`;
}

/**
 * Log verbose details for a generation result.
 */
function logGenerationVerbose(
	log: EvalLogger,
	genIndex: number,
	workflow: SimpleWorkflow,
	panelResult: JudgePanelResult,
	genTimeMs: number,
	numJudges: number,
): void {
	const status = panelResult.majorityPass ? pc.green('PASS') : pc.red('FAIL');
	const score = (panelResult.avgDiagnosticScore * 100).toFixed(0);

	log.verbose(
		`    Gen ${genIndex}: ${status} (${panelResult.primaryPasses}/${numJudges} judges, ${score}%)`,
	);
	log.verbose(`      Timing: ${formatTiming(genTimeMs, panelResult)}`);
	log.verbose(`      Workflow: ${summarizeWorkflowNodes(workflow)}`);

	for (const [i, judge] of panelResult.judgeResults.entries()) {
		const judgeStatus = judge.primaryPass ? pc.green('PASS') : pc.red('FAIL');
		log.verbose(`        Judge ${i + 1}: ${judgeStatus} - ${getJudgeSummary(judge)}`);
	}
}

// ============================================================================
// Target Factory
// ============================================================================

export interface CreatePairwiseTargetOptions {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	numJudges: number;
	numGenerations: number;
	featureFlags?: BuilderFeatureFlags;
	experimentName?: string;
	/** Optional logger for verbose output */
	logger?: EvalLogger;
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
	const { parsedNodeTypes, llm, numJudges, numGenerations, featureFlags, experimentName, logger } =
		options;

	return traceable(
		async (inputs: PairwiseDatasetInput): Promise<PairwiseTargetOutput> => {
			const { prompt, evals: evalCriteria } = inputs;

			// Log prompt being evaluated (verbose)
			if (logger) {
				const shortPrompt = prompt.slice(0, 60) + (prompt.length > 60 ? '...' : '');
				logger.verbose(`  Evaluating: "${shortPrompt}"`);
			}

			// Generate ALL workflows and run judges in parallel
			const generationResults: GenerationResult[] = await Promise.all(
				Array.from({ length: numGenerations }, async (_, i) => {
					const generationIndex = i + 1;
					const genStartTime = Date.now();

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
					const genTimeMs = Date.now() - genStartTime;

					const panelResult = await runJudgePanel(llm, workflow, evalCriteria, numJudges, {
						generationIndex,
						experimentName,
					});

					// Verbose logging for this generation
					if (logger) {
						logGenerationVerbose(
							logger,
							generationIndex,
							workflow,
							panelResult,
							genTimeMs,
							numJudges,
						);
					}

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
 */
export async function generateWorkflow(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	prompt: string,
	featureFlags?: BuilderFeatureFlags,
): Promise<SimpleWorkflow> {
	const runId = generateRunId();

	const agent = createAgent({ parsedNodeTypes, llm, featureFlags });

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
