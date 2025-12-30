import type { BaseMessage } from '@langchain/core/messages';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { traceable } from 'langsmith/traceable';

import { evaluateWorkflow } from '../chains/workflow-evaluator.js';
import { EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants.js';
import type { EvaluationMode } from '../core/argument-parser.js';
import { createAgent } from '../core/environment.js';
import {
	EvaluationRunnerBase,
	type BaseTargetOutput,
	type LangsmithRunOptions,
	type LocalRunOptions,
} from '../core/runner-base.js';
import { programmaticEvaluation } from '../programmatic/programmatic-evaluation.js';
import type { EvaluationInput, CategoryScore } from '../types/evaluation.js';
import {
	generateRunId,
	isWorkflowStateValues,
	safeExtractUsage,
	extractMessageContent,
	formatViolations,
	type UsageMetadata,
} from '../types/langsmith.js';
import { consumeGenerator, getChatPayload } from '../utils/evaluation-helpers.js';

/**
 * Input format for LLM-judge evaluation dataset.
 * Matches the LangSmith dataset structure with messages array.
 */
export interface LLMJudgeDatasetInput {
	messages: BaseMessage[];
	[key: string]: unknown;
}

/**
 * Output from LLM-judge target function.
 */
export interface LLMJudgeTargetOutput extends BaseTargetOutput {
	usage?: Partial<UsageMetadata>;
}

/**
 * Helper to convert category scores to Langsmith results.
 */
function categoryToResult(key: string, category: CategoryScore): LangsmithEvaluationResult {
	return {
		key,
		score: category.score,
		comment: formatViolations(category.violations),
	};
}

/**
 * Build LangSmith-compatible evaluation results from workflow evaluation.
 */
function buildEvaluationFeedback(
	evaluationResult: Awaited<ReturnType<typeof evaluateWorkflow>>,
	programmaticResult: Awaited<ReturnType<typeof programmaticEvaluation>>,
	usage?: Partial<UsageMetadata>,
): LangsmithEvaluationResult[] {
	const results: LangsmithEvaluationResult[] = [];

	// Add core category scores
	const categories = [
		{ key: 'functionality', score: evaluationResult.functionality },
		{ key: 'connections', score: evaluationResult.connections },
		{ key: 'expressions', score: evaluationResult.expressions },
		{ key: 'nodeConfiguration', score: evaluationResult.nodeConfiguration },
	];

	for (const { key, score } of categories) {
		results.push(categoryToResult(key, score));
	}

	// Add efficiency and sub-metrics
	results.push(categoryToResult('efficiency', evaluationResult.efficiency));
	results.push({
		key: 'efficiency.redundancyScore',
		score: evaluationResult.efficiency.redundancyScore,
	});
	results.push({
		key: 'efficiency.pathOptimization',
		score: evaluationResult.efficiency.pathOptimization,
	});
	results.push({
		key: 'efficiency.nodeCountEfficiency',
		score: evaluationResult.efficiency.nodeCountEfficiency,
	});

	// Add data flow
	results.push(categoryToResult('dataFlow', evaluationResult.dataFlow));

	// Add maintainability and sub-metrics
	results.push(categoryToResult('maintainability', evaluationResult.maintainability));
	results.push({
		key: 'maintainability.nodeNamingQuality',
		score: evaluationResult.maintainability.nodeNamingQuality,
	});
	results.push({
		key: 'maintainability.workflowOrganization',
		score: evaluationResult.maintainability.workflowOrganization,
	});
	results.push({
		key: 'maintainability.modularity',
		score: evaluationResult.maintainability.modularity,
	});

	// Add usage metadata if available
	if (usage) {
		const usageMetrics = [
			{ key: 'inputTokens', value: usage.input_tokens },
			{ key: 'outputTokens', value: usage.output_tokens },
			{ key: 'cacheCreationInputTokens', value: usage.cache_creation_input_tokens },
			{ key: 'cacheReadInputTokens', value: usage.cache_read_input_tokens },
		];

		for (const metric of usageMetrics) {
			if (metric.value !== undefined) {
				// LangSmith has a limitation on large scores (>99999) so we track in thousands
				results.push({ key: metric.key, score: metric.value / 1000 });
			}
		}

		// Add total prompt tokens
		const totalPromptTokens =
			(usage.input_tokens ?? 0) +
			(usage.cache_creation_input_tokens ?? 0) +
			(usage.cache_read_input_tokens ?? 0);

		if (totalPromptTokens > 0) {
			results.push({
				key: 'totalPromptTokens',
				score: totalPromptTokens / 1000,
				comment: 'Total prompt size (fresh + cached + cache creation)',
			});
		}

		// Calculate cache hit rate
		if (usage.cache_read_input_tokens !== undefined) {
			const inputTokens = usage.input_tokens ?? 0;
			const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
			const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

			const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
			const cacheHitRate = totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0;

			results.push({
				key: 'cacheHitRate',
				score: cacheHitRate,
				comment: `${(cacheHitRate * 100).toFixed(1)}% of input tokens served from cache`,
			});
		}
	}

	// Add overall score
	results.push({
		key: 'overallScore',
		score: evaluationResult.overallScore,
		comment: evaluationResult.summary,
	});

	// Add programmatic evaluation scores
	results.push({
		key: 'programmatic.overall',
		score: programmaticResult.overallScore,
	});
	results.push(categoryToResult('programmatic.connections', programmaticResult.connections));
	results.push(categoryToResult('programmatic.trigger', programmaticResult.trigger));
	results.push(categoryToResult('programmatic.agentPrompt', programmaticResult.agentPrompt));
	results.push(categoryToResult('programmatic.tools', programmaticResult.tools));
	results.push(categoryToResult('programmatic.fromAi', programmaticResult.fromAi));

	// Add workflow similarity if available
	if (programmaticResult.similarity !== null && programmaticResult.similarity !== undefined) {
		results.push(categoryToResult('programmatic.similarity', programmaticResult.similarity));
	}

	return results;
}

/**
 * LLM-as-judge evaluation runner.
 *
 * Key fix: ALL evaluation work (LLM calls, programmatic checks) happens
 * in the target function, not the evaluator. The evaluator just extracts
 * pre-computed feedback. This avoids 403 errors in LangSmith 0.4.x.
 */
export class LLMJudgeRunner extends EvaluationRunnerBase<
	LLMJudgeDatasetInput,
	LLMJudgeTargetOutput
> {
	getMode(): EvaluationMode {
		return 'llm-judge-langsmith';
	}

	getDisplayName(): string {
		return 'LLM-as-Judge Evaluation';
	}

	/**
	 * Creates the target function that does ALL work:
	 * 1. Generate workflow
	 * 2. Run LLM-based evaluation
	 * 3. Run programmatic evaluation
	 * 4. Return pre-computed feedback
	 */
	createTarget(): (inputs: LLMJudgeDatasetInput) => Promise<LLMJudgeTargetOutput> {
		const { parsedNodeTypes, llm, args, logger } = this;
		const featureFlags = args.featureFlags;

		// Create traceable wrapper for the entire target
		const target = traceable(
			async (inputs: LLMJudgeDatasetInput): Promise<LLMJudgeTargetOutput> => {
				const runId = generateRunId();

				// Validate inputs
				if (!inputs.messages || !Array.isArray(inputs.messages) || inputs.messages.length === 0) {
					throw new Error('No messages provided in inputs');
				}

				// Extract prompt from first message
				const firstMessage = inputs.messages[0];
				const prompt = extractMessageContent(firstMessage);

				// Log start (verbose)
				if (logger?.isVerbose) {
					const shortPrompt = prompt.slice(0, 60) + (prompt.length > 60 ? '...' : '');
					logger.verbose(`  Evaluating: "${shortPrompt}"`);
				}

				// Get LangChain callbacks for proper trace propagation
				const callbacks = await getLangchainCallbacks();

				// Generate workflow
				const agent = createAgent({ parsedNodeTypes, llm, featureFlags });
				await consumeGenerator(
					agent.chat(
						getChatPayload({
							evalType: EVAL_TYPES.LANGSMITH,
							message: prompt,
							workflowId: runId,
							featureFlags,
						}),
						EVAL_USERS.LANGSMITH,
						undefined, // abortSignal
						callbacks, // externalCallbacks for LangSmith tracing
					),
				);

				// Get generated workflow
				const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);
				if (!state.values || !isWorkflowStateValues(state.values)) {
					throw new Error('Invalid workflow state: workflow or messages missing');
				}

				const workflow = state.values.workflowJSON;
				const messages = state.values.messages;
				const usage = safeExtractUsage(messages);

				// Log workflow generated (verbose)
				if (logger?.isVerbose) {
					const nodeCount = workflow.nodes?.length ?? 0;
					logger.verbose(`    Generated workflow: ${nodeCount} nodes`);
				}

				// Run LLM-based evaluation (this is the key fix - runs IN target, not evaluator)
				const evaluationInput: EvaluationInput = {
					userPrompt: prompt,
					generatedWorkflow: workflow,
				};

				const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

				// Run programmatic evaluation
				const programmaticResult = await programmaticEvaluation(evaluationInput, parsedNodeTypes);

				// Log scores (verbose)
				if (logger?.isVerbose) {
					const overall = (evaluationResult.overallScore * 100).toFixed(0);
					const func = (evaluationResult.functionality.score * 100).toFixed(0);
					const conn = (evaluationResult.connections.score * 100).toFixed(0);
					logger.verbose(`    Scores: overall=${overall}%, func=${func}%, conn=${conn}%`);
				}

				// Build pre-computed feedback
				const feedback = buildEvaluationFeedback(evaluationResult, programmaticResult, usage);

				return {
					workflow,
					prompt,
					usage,
					feedback,
				};
			},
			{ name: TRACEABLE_NAMES.WORKFLOW_GENERATION, run_type: 'chain' },
		);

		return target;
	}

	/**
	 * Run a single local test.
	 */
	protected async runSingleLocalTest(prompt: string): Promise<LLMJudgeTargetOutput> {
		const { parsedNodeTypes, llm, args } = this;
		const featureFlags = args.featureFlags;

		// Generate workflow
		const workflow = await this.generateWorkflow(prompt, featureFlags);

		// Run LLM-based evaluation
		const evaluationInput: EvaluationInput = {
			userPrompt: prompt,
			generatedWorkflow: workflow,
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

		// Run programmatic evaluation
		const programmaticResult = await programmaticEvaluation(evaluationInput, parsedNodeTypes);

		// Build feedback
		const feedback = buildEvaluationFeedback(evaluationResult, programmaticResult);

		return {
			workflow,
			prompt,
			feedback,
		};
	}
}

/**
 * Create and run LLM-judge evaluation in LangSmith mode.
 */
export async function runLLMJudgeLangsmith(options: LangsmithRunOptions): Promise<void> {
	const runner = new LLMJudgeRunner();
	await runner.runLangsmith(options);
}

/**
 * Create and run LLM-judge evaluation in local mode.
 */
export async function runLLMJudgeLocal(options: LocalRunOptions): Promise<void> {
	const runner = new LLMJudgeRunner();
	await runner.runLocal(options);
}
