import {
	type AgentMessage,
	type ContextNote,
	type ContextNoteProvider,
	type ContextNoteRequest,
} from '@n8n/agents';
import type { EmbeddingModel } from 'ai';
import { cosineSimilarity, embedMany } from 'ai';

import { createBm25Index } from './gotcha-bm25';
import {
	isGotchaAblated,
	type GotchaPhase,
	type SkillGotcha,
	type SkillGotchaSet,
} from './skill-gotchas';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../tools/tool-ids';

const CALL_TOOL_TOOL_NAME = 'call_tool';

/** A successful call to one of these means a workflow exists in this conversation. */
const AFTER_BUILD_TOOLS = new Set<string>([
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RUN_WORKFLOW,
	DOMAIN_TOOL_IDS.DEBUG_EXECUTION,
]);

/** A successful call to one of these means the agent edits saved workflow code. */
const EDITING_TOOLS = new Set<string>([
	DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE,
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
]);

/** Not tuned yet. Calibrate with eval traces (scores of notes that helped vs. noise). */
export const DEFAULT_GOTCHA_SCORE_THRESHOLD = 0.4;
/** Threshold on the normalized BM25 score. Not tuned yet. */
export const DEFAULT_GOTCHA_BM25_THRESHOLD = 0.2;
export const DEFAULT_GOTCHA_TOP_K = 3;

const MAX_INTENT_CHARS = 1_500;
const MAX_STEP_CHARS = 2_500;
const MAX_TOOL_OUTPUT_CHARS = 300;

export interface GotchaMatch {
	skillId: string;
	gotchaId: string;
	score: number;
}

export type GotchaRetrievalMethod = 'embedding' | 'bm25';

export interface GotchaRetrievalTrace {
	method: GotchaRetrievalMethod;
	query: StepQuery;
	matches: GotchaMatch[];
	/** Best candidates under the threshold, to help tune it. */
	nearMisses: GotchaMatch[];
}

export interface GotchaNotesOptions {
	sets: readonly SkillGotchaSet[];
	/** Without an embedding model, the provider ranks gotchas with BM25. */
	embeddingModel?: EmbeddingModel;
	/** Defaults depend on the method: the scores are on different scales. */
	threshold?: number;
	topK?: number;
	ablated?: ReadonlySet<string>;
	onRetrieval?: (trace: GotchaRetrievalTrace) => void;
	/** Called once when embedding fails and the provider switches to BM25 for good. */
	onEmbeddingFailure?: (error: unknown) => void;
}

export interface StepQuery {
	/** What the user asked for, from the latest user message. */
	intent: string;
	/** What the agent did last: its text, tool calls, and errors. */
	step: string;
}

/** Note id used in the conversation. Ids are unique across skills. */
export function gotchaNoteId(skillId: string, gotchaId: string): string {
	return `gotcha:${skillId}:${gotchaId}`;
}

function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isLlmMessage(message: AgentMessage): message is Extract<AgentMessage, { role: string }> {
	return 'role' in message && Array.isArray(message.content);
}

const INJECTED_TAGS = 'thread-context|system-reminder|context|skill';
const INJECTED_BLOCK = new RegExp(`<(${INJECTED_TAGS})(?:\\s[^>]*)?>[\\s\\S]*?</\\1>`, 'gi');
const INJECTED_START = new RegExp(`^\\s*<(${INJECTED_TAGS})[\\s>]`, 'i');

/**
 * Removes runtime-added blocks (thread context, skill bodies, reminders) from
 * message text. The service puts `<thread-context>` in the same text part as
 * the user's request, so a whole-part check would keep the context and cut the
 * request off at the length limit.
 */
function stripInjectedText(text: string): string {
	const stripped = text.replace(INJECTED_BLOCK, '').trim();
	// An unclosed block is runtime text all the way to the end.
	return INJECTED_START.test(stripped) ? '' : stripped;
}

const CODE_FENCE = /```[\s\S]*?(```|$)/g;
const MARKUP_TAG = /<\/?[a-z][^>]*>/gi;
const EXPRESSION = /\{\{[\s\S]*?\}\}/g;

/**
 * Removes code and markup from query text. They add little meaning to the
 * match, and the AI proxy firewall blocks requests that contain them (403).
 */
function toPlainQueryText(text: string): string {
	return text
		.replace(CODE_FENCE, ' ')
		.replace(MARKUP_TAG, ' ')
		.replace(EXPRESSION, ' ')
		.replace(/[<>{}`$;|\\]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Short form of a tool call: the tool name and the top-level input keys. */
function describeToolCall(toolName: string, input: unknown): string {
	const name = calledToolName(toolName, input);
	const keys = isPlainObject(input) ? Object.keys(input).filter((key) => key !== 'tool') : [];
	return keys.length ? `${name} with ${keys.join(', ')}` : name;
}

/** Name of the tool a call runs, looking through the catalog dispatcher. */
function calledToolName(toolName: string, input: unknown): string {
	if (toolName === CALL_TOOL_TOOL_NAME && isPlainObject(input) && typeof input.tool === 'string') {
		return input.tool;
	}
	return toolName;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Phases the conversation has reached, from the tools that succeeded so far. */
export function detectGotchaPhases(messages: readonly AgentMessage[]): Set<GotchaPhase> {
	const phases = new Set<GotchaPhase>();
	for (const message of messages) {
		if (!isLlmMessage(message)) continue;
		for (const part of message.content) {
			if (part.type !== 'tool-call' || part.state !== 'resolved') continue;
			const name = calledToolName(part.toolName, part.input);
			if (AFTER_BUILD_TOOLS.has(name)) phases.add('after-build');
			if (EDITING_TOOLS.has(name)) phases.add('editing');
		}
	}
	return phases;
}

/**
 * Builds the retrieval query for the next model call from the latest user
 * request and the agent's latest assistant/tool activity.
 */
export function buildStepQuery(messages: readonly AgentMessage[]): StepQuery {
	const llmMessages = messages.filter(isLlmMessage);

	let intent = '';
	for (let i = llmMessages.length - 1; i >= 0 && !intent; i--) {
		const message = llmMessages[i];
		if (message.role !== 'user') continue;
		intent = message.content
			.flatMap((part) =>
				part.type === 'text' ? [toPlainQueryText(stripInjectedText(part.text))] : [],
			)
			.filter(Boolean)
			.join('\n')
			.trim();
	}

	// The latest step is everything after the last user message.
	const stepParts: string[] = [];
	for (let i = llmMessages.length - 1; i >= 0; i--) {
		const message = llmMessages[i];
		if (message.role === 'user') break;
		const parts: string[] = [];
		for (const part of message.content) {
			if (part.type === 'text' || part.type === 'reasoning') {
				const text = toPlainQueryText(stripInjectedText(part.text));
				if (text) parts.push(text);
			} else if (part.type === 'tool-call') {
				// Inputs and results hold workflow code, SQL and HTML: keep only what was called.
				parts.push(`Called ${describeToolCall(part.toolName, part.input)}`);
				if (part.state === 'rejected') {
					parts.push(`Error: ${truncate(toPlainQueryText(part.error), MAX_TOOL_OUTPUT_CHARS)}`);
				}
			} else if (part.type === 'invalid-tool-call') {
				parts.push(`Invalid call ${part.name ?? ''}: ${toPlainQueryText(part.error ?? '')}`.trim());
			}
		}
		if (parts.length) stepParts.unshift(parts.join('\n'));
		// Stop when the step query is long enough; recent activity matters most.
		if (stepParts.join('\n').length > MAX_STEP_CHARS) break;
	}

	const step = stepParts.join('\n');
	return {
		intent: truncate(intent, MAX_INTENT_CHARS),
		step: step.length > MAX_STEP_CHARS ? `…${step.slice(-MAX_STEP_CHARS)}` : step,
	};
}

// Gotcha embeddings depend only on the model and the text, so runs share them.
const gotchaEmbeddingCache = new Map<string, Promise<number[]>>();

function embeddingModelKey(model: EmbeddingModel): string {
	return typeof model === 'string' ? model : `${model.provider}/${model.modelId}`;
}

async function embedGotchaTexts(
	model: EmbeddingModel,
	texts: string[],
	abortSignal?: AbortSignal,
): Promise<number[][]> {
	const modelKey = embeddingModelKey(model);
	const missing = [...new Set(texts)].filter(
		(text) => !gotchaEmbeddingCache.has(`${modelKey}\u0000${text}`),
	);
	if (missing.length > 0) {
		const batch = embedMany({ model, values: missing, abortSignal });
		missing.forEach((text, i) => {
			const key = `${modelKey}\u0000${text}`;
			const entry = batch.then(({ embeddings }) => embeddings[i]);
			// Let the next call retry instead of caching the failure.
			entry.catch(() => gotchaEmbeddingCache.delete(key));
			gotchaEmbeddingCache.set(key, entry);
		});
	}
	return await Promise.all(
		texts.map(async (text) => {
			const entry = gotchaEmbeddingCache.get(`${modelKey}\u0000${text}`);
			if (!entry) throw new Error(`Missing gotcha embedding for "${text}"`);
			return await entry;
		}),
	);
}

interface Candidate {
	skillId: string;
	gotcha: SkillGotcha;
}

/** Scores every candidate (by index) against the query parts. */
type GotchaScorer = (queries: string[], abortSignal?: AbortSignal) => Promise<number[]>;

function createEmbeddingScorer(
	model: EmbeddingModel,
	candidates: readonly Candidate[],
): GotchaScorer {
	return async (queries, abortSignal) => {
		const gotchaEmbeddings = await embedGotchaTexts(
			model,
			candidates.map(({ gotcha }) => gotcha.appliesWhen),
			abortSignal,
		);
		const { embeddings } = await embedMany({ model, values: queries, abortSignal });
		return gotchaEmbeddings.map((embedding) =>
			Math.max(...embeddings.map((query) => cosineSimilarity(query, embedding))),
		);
	};
}

function createBm25Scorer(candidates: readonly Candidate[]): GotchaScorer {
	// The rule text adds the exact code terms (`onTrue`, `executeOnce`) that steps contain.
	const index = createBm25Index(
		candidates.map(({ gotcha }, i) => ({ key: i, text: `${gotcha.appliesWhen} ${gotcha.text}` })),
	);
	return async (queries) => {
		const perQuery = queries.map((query) => index.score(query));
		return candidates.map((_, i) => Math.max(0, ...perQuery.map((scores) => scores.get(i) ?? 0)));
	};
}

/**
 * Returns a context note provider that adds the gotchas of active skills whose
 * `appliesWhen` is close to the current step: by embedding similarity when an
 * embedding model is set, else by BM25.
 *
 * Gotcha embeddings are cached across runs. Each distinct query is scored once;
 * repeated model calls with no new activity reuse the last result.
 */
export function createGotchaNotesProvider(options: GotchaNotesOptions): ContextNoteProvider {
	let threshold =
		options.threshold ??
		(options.embeddingModel ? DEFAULT_GOTCHA_SCORE_THRESHOLD : DEFAULT_GOTCHA_BM25_THRESHOLD);
	const topK = options.topK ?? DEFAULT_GOTCHA_TOP_K;
	const ablated = options.ablated ?? new Set<string>();

	const candidates: Candidate[] = options.sets.flatMap((set) =>
		set.gotchas
			.filter((gotcha) => !isGotchaAblated(gotcha.id, ablated))
			.map((gotcha) => ({ skillId: set.skillId, gotcha })),
	);

	let method: GotchaRetrievalMethod = options.embeddingModel ? 'embedding' : 'bm25';
	let bm25Scorer: GotchaScorer | undefined;
	const getBm25Scorer = () => (bm25Scorer ??= createBm25Scorer(candidates));
	const embeddingScorer = options.embeddingModel
		? createEmbeddingScorer(options.embeddingModel, candidates)
		: undefined;

	// If embedding fails (blocked proxy, bad key), rank with BM25 for the rest of the run.
	const scorer: GotchaScorer = async (queries, abortSignal) => {
		if (method === 'embedding' && embeddingScorer) {
			try {
				return await embeddingScorer(queries, abortSignal);
			} catch (error) {
				if (abortSignal?.aborted) throw error;
				method = 'bm25';
				threshold = options.threshold ?? DEFAULT_GOTCHA_BM25_THRESHOLD;
				options.onEmbeddingFailure?.(error);
			}
		}
		return await getBm25Scorer()(queries, abortSignal);
	};

	let lastQueryKey: string | undefined;
	let lastScores: GotchaMatch[] = [];

	return async (request: ContextNoteRequest): Promise<ContextNote[]> => {
		const active = new Set(request.activeSkillIds);
		if (!candidates.some(({ skillId }) => active.has(skillId))) return [];

		const query = buildStepQuery(request.messages);
		const queries = [query.intent, query.step].filter((text) => text.trim());
		if (queries.length === 0) return [];

		const queryKey = queries.join('\u0000');
		if (queryKey !== lastQueryKey) {
			// Each gotcha takes its best score against either query part, so a long
			// user request does not dilute a specific step (and vice versa).
			const scores = await scorer(queries, request.abortSignal);
			lastScores = candidates.map(({ skillId, gotcha }, i) => ({
				skillId,
				gotchaId: gotcha.id,
				score: scores[i],
			}));
			lastQueryKey = queryKey;
		}

		// A gotcha for a later phase stays unsent, so it can still fire once that phase starts.
		const phases = detectGotchaPhases(request.messages);
		const phaseByKey = new Map(
			candidates.map(({ skillId, gotcha }) => [`${skillId}:${gotcha.id}`, gotcha.phase]),
		);
		const ranked = lastScores
			.filter(({ skillId, gotchaId }) => {
				if (!active.has(skillId)) return false;
				if (request.sentNoteIds.has(gotchaNoteId(skillId, gotchaId))) return false;
				const phase = phaseByKey.get(`${skillId}:${gotchaId}`);
				return phase === undefined || phases.has(phase);
			})
			.sort((a, b) => b.score - a.score);
		const matches = ranked.filter(({ score }) => score >= threshold).slice(0, topK);
		options.onRetrieval?.({
			method,
			query,
			matches,
			nearMisses: ranked.filter(({ score }) => score < threshold).slice(0, 3),
		});

		const byKey = new Map(candidates.map((item) => [`${item.skillId}:${item.gotcha.id}`, item]));
		return matches.flatMap(({ skillId, gotchaId }) => {
			const item = byKey.get(`${skillId}:${gotchaId}`);
			return item ? [{ id: gotchaNoteId(skillId, gotchaId), content: item.gotcha.text }] : [];
		});
	};
}
