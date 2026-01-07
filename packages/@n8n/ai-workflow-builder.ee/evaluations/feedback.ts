import type { Feedback } from './harness-types';

export interface LangsmithEvaluationResultLike {
	key: string;
	score: number;
	comment?: string;
}

export function feedbackKey(feedback: Feedback): string {
	return `${feedback.evaluator}.${feedback.metric}`;
}

export function toLangsmithEvaluationResult(feedback: Feedback): LangsmithEvaluationResultLike {
	return {
		key: feedback.metric,
		score: feedback.score,
		...(feedback.comment ? { comment: feedback.comment } : {}),
	};
}
