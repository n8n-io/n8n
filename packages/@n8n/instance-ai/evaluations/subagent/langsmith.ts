// ---------------------------------------------------------------------------
// LangSmith integration helpers for sub-agent evaluation
// ---------------------------------------------------------------------------

import type { Example, Run } from 'langsmith/schemas';

import type { Feedback, SubAgentTestCase } from './types';

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
 * Join a multi-part object ({ part_01: "...", part_02: "...", ... }) into a
 * single string. Parts are sorted by key to ensure correct ordering.
 */
function joinParts(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (typeof value !== 'object' || value === null) return undefined;

	const parts = Object.entries(value as Record<string, unknown>)
		.filter(([k, v]) => k.startsWith('part_') && typeof v === 'string')
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, v]) => v as string);

	return parts.length > 0 ? parts.join('') : undefined;
}

/**
 * Map a LangSmith dataset example's inputs to a SubAgentTestCase.
 *
 * Supports two input formats:
 *
 * Simple format:
 * { prompt: string, subagent?, system_prompt?: string, tools?: string[], maxSteps? }
 *
 * Realistic trace format (from production orchestrator):
 * {
 *   task: string,                                    // the user request
 *   system_prompt: { part_01: "...", part_02: "..." }, // multi-part system prompt
 *   model?: string,                                   // model ID override
 *   loaded_tools?: Array<{ name: string, description: string }>,
 *   loaded_tool_catalog?: { part_01: "...", ... },    // extended tool descriptions
 *   maxSteps?: number,
 * }
 */
export function mapExampleToTestCase(
	inputs: Record<string, unknown>,
	exampleId?: string,
): SubAgentTestCase {
	// Accept either "task" (realistic traces) or "prompt" (simple format)
	const prompt = typeof inputs.task === 'string' ? inputs.task : inputs.prompt;
	if (typeof prompt !== 'string' || prompt.length === 0) {
		throw new Error(
			`Dataset example${exampleId ? ` (${exampleId})` : ''} missing required "task" or "prompt" field`,
		);
	}

	// System prompt: multi-part object or plain string
	const systemPrompt = joinParts(inputs.system_prompt);

	// Tools: array of { name, description } objects or plain string array
	let tools: string[] | undefined;
	if (Array.isArray(inputs.loaded_tools)) {
		tools = (inputs.loaded_tools as unknown[])
			.filter((t): t is { name: string } => typeof t === 'object' && t !== null && 'name' in t)
			.map((t) => t.name);
	} else if (Array.isArray(inputs.tools)) {
		tools = (inputs.tools as unknown[]).filter((t): t is string => typeof t === 'string');
	}

	const annotations =
		typeof inputs.annotations === 'object' && inputs.annotations !== null
			? (inputs.annotations as Record<string, unknown>)
			: undefined;

	return {
		id: exampleId ?? `ls-${Date.now()}`,
		prompt,
		subagent: typeof inputs.subagent === 'string' ? inputs.subagent : undefined,
		systemPrompt,
		tools,
		modelId: typeof inputs.model === 'string' ? inputs.model : undefined,
		maxSteps: typeof inputs.maxSteps === 'number' ? inputs.maxSteps : undefined,
		annotations,
	};
}
