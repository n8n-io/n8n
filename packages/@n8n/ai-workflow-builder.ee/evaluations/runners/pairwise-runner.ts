import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { traceable } from 'langsmith/traceable';
import pc from 'picocolors';

import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { TRACEABLE_NAMES, DEFAULTS } from '../constants.js';
import type { EvaluationMode } from '../core/argument-parser.js';
import {
	EvaluationRunnerBase,
	type BaseTargetOutput,
	type LangsmithRunOptions,
	type LocalRunOptions,
} from '../core/runner-base.js';
import { generateWorkflow } from '../pairwise/generator.js';
import type { PairwiseEvaluationResult } from '../pairwise/judge-chain.js';
import {
	runJudgePanel,
	aggregateGenerations,
	type GenerationResult,
	type JudgePanelResult,
} from '../pairwise/judge-panel.js';
import {
	buildSingleGenerationResults,
	buildMultiGenerationResults,
} from '../pairwise/metrics-builder.js';

/**
 * Input format for pairwise evaluation dataset.
 */
export interface PairwiseDatasetInput {
	prompt: string;
	evals: { dos: string; donts: string };
	[key: string]: unknown;
}

/**
 * Output from pairwise target function.
 */
export interface PairwiseTargetOutput extends BaseTargetOutput {
	evals: { dos: string; donts: string };
}

/**
 * Helper to get a brief summary of a judge result.
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
 * Pairwise evaluation runner.
 *
 * Uses do's/don'ts criteria with multiple judges voting.
 * Already follows the pre-computed feedback pattern.
 */
export class PairwiseRunner extends EvaluationRunnerBase<
	PairwiseDatasetInput,
	PairwiseTargetOutput
> {
	getMode(): EvaluationMode {
		return 'pairwise-langsmith';
	}

	getDisplayName(): string {
		return 'Pairwise Evaluation';
	}

	getDatasetName(): string {
		return process.env.LANGSMITH_DATASET_NAME ?? DEFAULTS.DATASET_NAME;
	}

	/**
	 * Creates the target function that does ALL work.
	 */
	createTarget(): (inputs: PairwiseDatasetInput) => Promise<PairwiseTargetOutput> {
		const { parsedNodeTypes, llm, args, logger } = this;
		const featureFlags = args.featureFlags;
		const numJudges = args.numJudges;
		const numGenerations = args.numGenerations;
		const experimentName = this.getExperimentName();

		const target = traceable(
			async (inputs: PairwiseDatasetInput): Promise<PairwiseTargetOutput> => {
				const { prompt, evals: evalCriteria } = inputs;

				// Log prompt being evaluated (verbose)
				if (logger?.isVerbose) {
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
						if (logger?.isVerbose) {
							const status = panelResult.majorityPass ? pc.green('PASS') : pc.red('FAIL');
							const score = (panelResult.avgDiagnosticScore * 100).toFixed(0);

							logger.verbose(
								`    Gen ${generationIndex}: ${status} (${panelResult.primaryPasses}/${numJudges} judges, ${score}%)`,
							);
							logger.verbose(`      Timing: ${formatTiming(genTimeMs, panelResult)}`);
							logger.verbose(`      Workflow: ${summarizeWorkflowNodes(workflow)}`);

							for (const [j, judge] of panelResult.judgeResults.entries()) {
								const judgeStatus = judge.primaryPass ? pc.green('PASS') : pc.red('FAIL');
								logger.verbose(
									`        Judge ${j + 1}: ${judgeStatus} - ${getJudgeSummary(judge)}`,
								);
							}
						}

						return { workflow, ...panelResult };
					}),
				);

				// Build feedback based on single or multi-generation
				let feedback: LangsmithEvaluationResult[];
				if (numGenerations === 1) {
					feedback = buildSingleGenerationResults(generationResults[0], numJudges);
				} else {
					const aggregation = aggregateGenerations(generationResults);
					feedback = buildMultiGenerationResults(aggregation, numJudges);
				}

				return {
					workflow: generationResults[0].workflow,
					prompt,
					evals: evalCriteria,
					feedback,
				};
			},
			{ name: TRACEABLE_NAMES.PAIRWISE_EVALUATION, run_type: 'chain' },
		);

		return target;
	}

	/**
	 * Run a single local test.
	 */
	protected async runSingleLocalTest(prompt: string): Promise<PairwiseTargetOutput> {
		const { parsedNodeTypes, llm, args } = this;
		const featureFlags = args.featureFlags;
		const numJudges = args.numJudges;
		const numGenerations = args.numGenerations;

		// For local tests, we need criteria from args
		const evalCriteria = {
			dos: args.dos ?? '',
			donts: args.donts ?? '',
		};

		// Generate workflow and run judge panel
		const generationResults: GenerationResult[] = await Promise.all(
			Array.from({ length: numGenerations }, async () => {
				const workflow = await generateWorkflow(parsedNodeTypes, llm, prompt, featureFlags);
				const panelResult = await runJudgePanel(llm, workflow, evalCriteria, numJudges);
				return { workflow, ...panelResult };
			}),
		);

		// Build feedback
		let feedback: LangsmithEvaluationResult[];
		if (numGenerations === 1) {
			feedback = buildSingleGenerationResults(generationResults[0], numJudges);
		} else {
			const aggregation = aggregateGenerations(generationResults);
			feedback = buildMultiGenerationResults(aggregation, numJudges);
		}

		return {
			workflow: generationResults[0].workflow,
			prompt,
			evals: evalCriteria,
			feedback,
		};
	}

	/**
	 * Override extractOverallScore for pairwise (uses different key).
	 */
	protected extractOverallScore(feedback: LangsmithEvaluationResult[]): number {
		const primary = feedback.find((f) => f.key === 'pairwise_primary');
		return typeof primary?.score === 'number' ? primary.score : 0;
	}
}

/**
 * Create and run pairwise evaluation in LangSmith mode.
 */
export async function runPairwiseLangsmith(options: LangsmithRunOptions): Promise<void> {
	const runner = new PairwiseRunner();
	await runner.runLangsmith(options);
}

/**
 * Create and run pairwise evaluation in local mode.
 */
export async function runPairwiseLocal(options: LocalRunOptions): Promise<void> {
	const runner = new PairwiseRunner();
	await runner.runLocal(options);
}
