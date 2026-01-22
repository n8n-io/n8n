import type { Feedback } from './harness-types';

export interface LangsmithEvaluationResultLike {
	key: string;
	score: number;
	comment?: string;
}

export function feedbackKey(feedback: Feedback): string {
	return `${feedback.evaluator}.${feedback.metric}`;
}

function isPairwiseV1Metric(metric: string): boolean {
	return metric.startsWith('pairwise_');
}

/**
 * Metric key mapping for LangSmith.
 *
 * Goal: keep keys comparable with historical runs.
 * - Programmatic: keep evaluator prefix (e.g. `programmatic.trigger`)
 * - LLM-judge: keep metrics unprefixed (e.g. `overallScore`, `connections`, `maintainability.nodeNamingQuality`)
 * - Pairwise: keep v1 metrics unprefixed (e.g. `pairwise_primary`), but namespace non-v1 details.
 */
export function langsmithMetricKey(feedback: Feedback): string {
	if (feedback.evaluator === 'pairwise') {
		return isPairwiseV1Metric(feedback.metric) ? feedback.metric : feedbackKey(feedback);
	}

	if (feedback.evaluator === 'programmatic') {
		return feedbackKey(feedback);
	}

	if (feedback.evaluator === 'llm-judge') {
		return feedback.metric;
	}

	// Default: prefix unknown evaluators to avoid collisions with unprefixed `llm-judge` metrics.
	return feedbackKey(feedback);
}

export function toLangsmithEvaluationResult(feedback: Feedback): LangsmithEvaluationResultLike {
	return {
		key: langsmithMetricKey(feedback),
		score: feedback.score,
		...(feedback.comment ? { comment: feedback.comment } : {}),
	};
}
