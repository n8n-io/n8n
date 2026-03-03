import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { RunnableConfig } from '@langchain/core/runnables';

import { evaluateWorkflowPairwise, type PairwiseEvaluationResult } from './judge-chain';
import type { SimpleWorkflow } from '../../../src/types/workflow';
import {
	getTracingCallbacks,
	runWithOptionalLimiter,
	withTimeout,
} from '../../harness/evaluation-helpers';
import type { EvaluationContext } from '../../harness/harness-types';

// ============================================================================
// Types
// ============================================================================

/** Evaluation criteria - at least one of dos or donts should be provided */
export interface EvalCriteria {
	dos?: string;
	donts?: string;
}

export interface JudgePanelTiming {
	/** Total time for all judges in milliseconds */
	totalMs: number;
	/** Time per judge in milliseconds */
	perJudgeMs: number[];
}

export interface JudgePanelResult {
	judgeResults: PairwiseEvaluationResult[];
	primaryPasses: number;
	majorityPass: boolean;
	avgDiagnosticScore: number;
	/** Timing information (only populated when timing is tracked) */
	timing?: JudgePanelTiming;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate minimum judges needed for majority (e.g., 2 for 3 judges, 3 for 5 judges)
 * @param numJudges - Number of judges (must be >= 1)
 * @throws Error if numJudges < 1
 */
export function getMajorityThreshold(numJudges: number): number {
	if (numJudges < 1) {
		throw new Error(`getMajorityThreshold requires numJudges >= 1, got ${numJudges}`);
	}
	return Math.ceil(numJudges / 2);
}

// ============================================================================
// Judge Panel Execution
// ============================================================================

export interface JudgePanelOptions {
	/** Experiment name for metadata */
	experimentName?: string;
	/** Optional limiter for LLM calls (shared across harness) */
	llmCallLimiter?: EvaluationContext['llmCallLimiter'];
	/** Optional timeout for each judge call */
	timeoutMs?: number;
}

/**
 * Run a panel of judges on a workflow.
 * Executes judges in parallel and aggregates their results.
 *
 * @param llm - Language model for evaluation
 * @param workflow - Workflow to evaluate
 * @param evalCriteria - Evaluation criteria (dos/donts)
 * @param numJudges - Number of judges to run
 * @param options - Optional metadata for tracing
 * @returns Aggregated judge panel results
 */
export async function runJudgePanel(
	llm: BaseChatModel,
	workflow: SimpleWorkflow,
	evalCriteria: EvalCriteria,
	numJudges: number,
	options?: JudgePanelOptions,
): Promise<JudgePanelResult> {
	const { experimentName, llmCallLimiter, timeoutMs } = options ?? {};
	const panelStartTime = Date.now();

	// Bridge LangSmith traceable context to LangChain callbacks
	const callbacks = await getTracingCallbacks();

	// Run all judges in parallel, tracking timing for each
	const judgeTimings: number[] = [];
	const judgeResults = await Promise.all(
		Array.from({ length: numJudges }, async (_, judgeIndex) => {
			const runJudge = async (): Promise<PairwiseEvaluationResult> => {
				const judgeStartTime = Date.now();

				// Build config with callbacks for proper trace context propagation
				const config: RunnableConfig = {
					runName: `judge_${judgeIndex + 1}`,
					metadata: {
						...(experimentName && { experiment_name: experimentName }),
					},
					callbacks,
				};

				const result = await withTimeout({
					promise: evaluateWorkflowPairwise(llm, { workflowJSON: workflow, evalCriteria }, config),
					timeoutMs,
					label: `pairwise:judge${judgeIndex + 1}`,
				});
				judgeTimings[judgeIndex] = Date.now() - judgeStartTime;
				return result;
			};

			return await runWithOptionalLimiter(runJudge, llmCallLimiter);
		}),
	);

	const totalMs = Date.now() - panelStartTime;
	const aggregated = aggregateJudgeResults(judgeResults, numJudges);

	return {
		...aggregated,
		timing: {
			totalMs,
			perJudgeMs: judgeTimings,
		},
	};
}

/**
 * Aggregate results from multiple judges into summary metrics.
 */
export function aggregateJudgeResults(
	judgeResults: PairwiseEvaluationResult[],
	numJudges: number,
): JudgePanelResult {
	const primaryPasses = judgeResults.filter((r) => r.primaryPass).length;
	const majorityPass = primaryPasses >= getMajorityThreshold(numJudges);
	const avgDiagnosticScore =
		judgeResults.reduce((sum, r) => sum + r.diagnosticScore, 0) / numJudges;

	return {
		judgeResults,
		primaryPasses,
		majorityPass,
		avgDiagnosticScore,
	};
}
