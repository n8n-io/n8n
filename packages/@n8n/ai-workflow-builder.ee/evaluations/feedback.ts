import type { Feedback } from './harness-types';

export interface LangsmithEvaluationResultLike {
	key: string;
	score: number;
	comment?: string;
}

export function feedbackKey(feedback: Feedback): string {
	return `${feedback.evaluator}.${feedback.metric}`;
}

export function toLangsmithEvaluationResult(
	feedback: Feedback,
	options?: { stripEvaluatorPrefix?: string },
): LangsmithEvaluationResultLike {
	const stripEvaluatorPrefix = options?.stripEvaluatorPrefix;
	const key =
		stripEvaluatorPrefix && feedback.evaluator === stripEvaluatorPrefix
			? feedback.metric
			: feedbackKey(feedback);

	return {
		key,
		score: feedback.score,
		...(feedback.comment ? { comment: feedback.comment } : {}),
	};
}
