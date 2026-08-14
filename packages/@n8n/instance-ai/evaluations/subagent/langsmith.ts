// ---------------------------------------------------------------------------
// LangSmith integration helpers for workflow-build evaluation
// ---------------------------------------------------------------------------

import type { Example, Run } from 'langsmith/schemas';

import type { Feedback, WorkflowBuildEvalCase } from './types';

// ---------------------------------------------------------------------------
// Feedback conversion
// ---------------------------------------------------------------------------

const LANGSMITH_SCORE_MAX = 99_999.9999;
const LANGSMITH_SCORE_MIN = -99_999.9999;

function clampScore(score: number): number {
	if (!Number.isFinite(score)) return 0;
	return Math.max(LANGSMITH_SCORE_MIN, Math.min(LANGSMITH_SCORE_MAX, score));
}

/**
 * Convert a Feedback item to the format LangSmith's evaluate() expects
 * from an evaluator function: { key, score, comment? }.
 */
export function toLangsmithFeedback(fb: Feedback): {
	key: string;
	score: number;
	comment?: string;
} {
	return {
		key: `${fb.evaluator}.${fb.metric}`,
		score: clampScore(fb.score),
		...(fb.comment ? { comment: fb.comment } : {}),
	};
}

// ---------------------------------------------------------------------------
// Feedback extractor (used as a LangSmith evaluator)
// ---------------------------------------------------------------------------

/**
 * Create a LangSmith evaluator that extracts pre-computed feedback from the
 * target function's outputs. The target stores feedback in `outputs.feedback`.
 *
 * Uses the destructured `{ run, outputs }` evaluator signature so the SDK
 * passes outputs directly instead of relying on the Run object's `.outputs`
 * property which may not be populated yet due to async timing in traceable.
 */
export function createFeedbackExtractor(): (args: {
	run: Run;
	example: Example;
	inputs: Record<string, unknown>;
	outputs: Record<string, unknown>;
	referenceOutputs?: Record<string, unknown>;
}) => { results: Array<{ key: string; score: number; comment?: string }> } {
	return ({ outputs }) => {
		if (!outputs) {
			return { results: [{ key: 'error', score: 0, comment: 'No outputs from run' }] };
		}

		const feedback = outputs.feedback;
		if (!Array.isArray(feedback)) {
			return { results: [{ key: 'error', score: 0, comment: 'No feedback in outputs' }] };
		}

		return { results: (feedback as Feedback[]).map(toLangsmithFeedback) };
	};
}

// ---------------------------------------------------------------------------
// Dataset example mapping
// ---------------------------------------------------------------------------

/**
 * Map a LangSmith dataset example's inputs to a WorkflowBuildEvalCase.
 *
 * Supports two input formats:
 *
 * Simple format:
 * { prompt: string, model?, annotations? }
 *
 * Realistic trace format (from production orchestrator):
 * {
 *   task: string,     // the user request
 *   model?: string,   // model ID override
 * }
 */
export function mapExampleToTestCase(
	inputs: Record<string, unknown>,
	exampleId?: string,
): WorkflowBuildEvalCase {
	// Accept either "task" (realistic traces) or "prompt" (simple format)
	const prompt = typeof inputs.task === 'string' ? inputs.task : inputs.prompt;
	if (typeof prompt !== 'string' || prompt.length === 0) {
		throw new Error(
			`Dataset example${exampleId ? ` (${exampleId})` : ''} missing required "task" or "prompt" field`,
		);
	}

	const annotations =
		typeof inputs.annotations === 'object' && inputs.annotations !== null
			? (inputs.annotations as Record<string, unknown>)
			: undefined;

	return {
		id: exampleId ?? `ls-${Date.now()}`,
		prompt,
		modelId: typeof inputs.model === 'string' ? inputs.model : undefined,
		annotations,
	};
}
