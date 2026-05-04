// ---------------------------------------------------------------------------
// Mock-user answerer for the eval harness.
//
// When the orchestrator's planner sub-agent calls `ask-user` to clarify the
// request, production suspends until a real user answers. The eval harness
// has no real user, so it used to return `{ approved: true }` with no
// answers — the planner saw `answered: false` and shipped a less-grounded
// plan. This module asks a cheap LLM (Haiku 4.5 by default) to pick answers
// based on the original eval prompt.
//
// Lean by design: prompt-only context (no dataset dos/donts), single LLM
// call per ask-user invocation, fail-soft (returns [] on any error so the
// caller falls back to the previous no-answer behavior).
// ---------------------------------------------------------------------------

import { createEvalAgent, extractText, HAIKU_MODEL } from '../../src/utils/eval-agents';

export interface AskUserQuestion {
	id: string;
	question: string;
	type: 'single' | 'multi' | 'text';
	options?: string[];
}

export interface AskUserAnswer {
	questionId: string;
	selectedOptions: string[];
	customText?: string;
}

export interface AnswerAskUserOptions {
	/** Original user prompt the eval was started with. */
	evalPrompt: string;
	/** Questions from the suspension payload. */
	questions: AskUserQuestion[];
	/** Optional intro message the planner attached to the suspension. */
	introMessage?: string;
	/** Override the default Haiku 4.5 model. */
	modelId?: string;
}

const SYSTEM_PROMPT = [
	"You are simulating a user answering a workflow-builder agent's clarifying",
	'questions. Pick answers consistent with the original request below.',
	'',
	'Rules:',
	'- For "single" questions: return exactly one option from the provided list.',
	'- For "multi" questions: return one or more options from the list.',
	'- For "text" questions: give a concrete, short answer (≤30 words).',
	'- When the original prompt does not specify, make a sensible default guess',
	'  for someone with that goal — never skip a question.',
	'- Do not invent option values for single/multi: only return strings that',
	"  appear verbatim in the question's options.",
	'',
	'Output MUST be valid JSON matching this shape:',
	'{"answers":[{"questionId":"...","selectedOptions":["..."],"customText":"..."}]}',
	'',
	'`selectedOptions` is required (use [] for text questions). `customText` is',
	'required for text questions and may be omitted for single/multi.',
	'Do not include any prose before or after the JSON.',
].join('\n');

export async function answerAskUser(options: AnswerAskUserOptions): Promise<AskUserAnswer[]> {
	const modelId = options.modelId ?? HAIKU_MODEL;
	const userMessage = buildUserMessage(options);

	let text: string;
	try {
		const agent = createEvalAgent('eval-mock-user', {
			model: modelId,
			instructions: SYSTEM_PROMPT,
			cache: false,
		});
		const result = await agent.generate(userMessage, {
			providerOptions: { anthropic: { maxTokens: 1024 } },
		});
		text = extractText(result);
	} catch {
		return [];
	}

	const parsed = parseAnswers(text);
	if (!parsed) return [];

	return validateAnswers(parsed, options.questions);
}

function buildUserMessage(options: AnswerAskUserOptions): string {
	const lines: string[] = [];
	lines.push('<original-prompt>');
	lines.push(options.evalPrompt);
	lines.push('</original-prompt>');
	lines.push('');
	if (options.introMessage) {
		lines.push('<planner-intro>');
		lines.push(options.introMessage);
		lines.push('</planner-intro>');
		lines.push('');
	}
	lines.push('<questions>');
	for (const q of options.questions) {
		lines.push(`- id: ${q.id}`);
		lines.push(`  type: ${q.type}`);
		lines.push(`  question: ${q.question}`);
		if (q.options && q.options.length > 0) {
			lines.push('  options:');
			for (const opt of q.options) lines.push(`    - ${opt}`);
		}
	}
	lines.push('</questions>');
	lines.push('');
	lines.push('Return ONLY the JSON object.');
	return lines.join('\n');
}

function parseAnswers(text: string): unknown {
	const trimmed = text.trim();
	// LLMs sometimes wrap JSON in fences; strip them defensively.
	const stripped = trimmed
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```\s*$/i, '')
		.trim();
	try {
		return JSON.parse(stripped);
	} catch {
		// Fallback: find the first {...} block.
		const match = stripped.match(/\{[\s\S]*\}/);
		if (!match) return null;
		try {
			return JSON.parse(match[0]);
		} catch {
			return null;
		}
	}
}

function validateAnswers(parsed: unknown, questions: AskUserQuestion[]): AskUserAnswer[] {
	if (!isRecord(parsed) || !Array.isArray(parsed.answers)) return [];
	const byId = new Map(questions.map((q) => [q.id, q] as const));
	const out: AskUserAnswer[] = [];
	for (const raw of parsed.answers) {
		if (!isRecord(raw)) continue;
		const questionId = typeof raw.questionId === 'string' ? raw.questionId : '';
		const q = byId.get(questionId);
		if (!q) continue;
		const selectedOptions = Array.isArray(raw.selectedOptions)
			? raw.selectedOptions.filter((s): s is string => typeof s === 'string')
			: [];
		const customText = typeof raw.customText === 'string' ? raw.customText : undefined;
		const answer = coerceAnswer(q, selectedOptions, customText);
		if (answer) out.push(answer);
	}
	return out;
}

function coerceAnswer(
	q: AskUserQuestion,
	selectedOptions: string[],
	customText: string | undefined,
): AskUserAnswer | null {
	if (q.type === 'text') {
		const text = customText ?? selectedOptions[0];
		if (!text) return null;
		return { questionId: q.id, selectedOptions: [], customText: text };
	}
	const validOptions = (q.options ?? []).filter((opt) => selectedOptions.includes(opt));
	if (validOptions.length === 0) {
		// LLM failed to pick a valid option. Fall back to the first available
		// option so the planner gets *some* signal rather than no answer.
		const fallback = q.options?.[0];
		if (!fallback) return null;
		return { questionId: q.id, selectedOptions: [fallback] };
	}
	const final = q.type === 'single' ? validOptions.slice(0, 1) : validOptions;
	return { questionId: q.id, selectedOptions: final };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
