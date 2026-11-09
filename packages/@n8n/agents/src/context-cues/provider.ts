import type { EmbeddingModel } from 'ai';

import { createBm25Index } from './bm25';
import type {
	ContextCue,
	ContextCueMatch,
	ContextCueProviderOptions,
	ContextCueRetrievalMethod,
	ContextCueSetPredicate,
	ContextCueStepQuery,
} from './types';
import { loadAi } from '../runtime/model/lazy-ai';
import { isLlmMessage } from '../sdk/message';
import { SKILL_LOAD_TOOL_NAME } from '../skills/types';
import type {
	ContextCueEntry,
	ContextCueProvider,
	ContextCueRequest,
} from '../types/runtime/agent-runtime';
import type { AgentMessage } from '../types/sdk/message';

/** Not tuned for every domain. Calibrate with eval traces (scores of cues that helped vs. noise). */
export const DEFAULT_CONTEXT_CUE_EMBEDDING_THRESHOLD = 0.4;
/** Threshold on the normalized BM25 score. */
export const DEFAULT_CONTEXT_CUE_BM25_THRESHOLD = 0.2;
export const DEFAULT_CONTEXT_CUE_TOP_K = 3;

const MAX_INTENT_CHARS = 1_500;
const MAX_STEP_CHARS = 2_500;
const MAX_TOOL_OUTPUT_CHARS = 300;

/** Tags that the agents runtime adds to message text. */
const RUNTIME_INJECTED_TAGS = ['system-reminder', 'context', 'skill'];

/** Cue id used in the conversation. Ids are unique across sets. */
export function contextCueId(setId: string, cueId: string): string {
	return `cue:${setId}:${cueId}`;
}

/** Parses a comma-separated list of cue ids to ablate, such as an env var value. */
export function parseAblatedContextCues(value: string | undefined): ReadonlySet<string> {
	return new Set(
		(value ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean),
	);
}

function isAblated(id: string, ablated: ReadonlySet<string>): boolean {
	return ablated.has('*') || ablated.has(id);
}

function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes injected blocks (skill bodies, cues, host context) from message
 * text. A host can put its context in the same text part as the user's
 * request, so a whole-part check would keep the context and cut the request off.
 */
function createInjectedTextStripper(extraTags: readonly string[]): (text: string) => string {
	const tags = [...RUNTIME_INJECTED_TAGS, ...extraTags].map(escapeRegExp).join('|');
	const block = new RegExp(`<(${tags})(?:\\s[^>]*)?>[\\s\\S]*?</\\1>`, 'gi');
	const start = new RegExp(`^\\s*<(${tags})[\\s>]`, 'i');
	return (text) => {
		const stripped = text.replace(block, '').trim();
		// An unclosed block is injected text all the way to the end.
		return start.test(stripped) ? '' : stripped;
	};
}

const CODE_FENCE = /```[\s\S]*?(```|$)/g;
const MARKUP_TAG = /<\/?[a-z][^>]*>/gi;
const EXPRESSION = /\{\{[\s\S]*?\}\}/g;

/**
 * Removes code and markup from query text. They add little meaning to the
 * match, and some AI proxy firewalls block requests that contain them.
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Short form of a tool call: the tool name and the top-level input keys. */
function describeToolCall(toolName: string, input: unknown): string {
	const keys = isPlainObject(input) ? Object.keys(input) : [];
	return keys.length ? `${toolName} with ${keys.join(', ')}` : toolName;
}

/** Skills that the agent loaded in its latest assistant message. */
export function detectJustLoadedSkills(messages: readonly AgentMessage[]): Set<string> {
	const loaded = new Set<string>();
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (!isLlmMessage(message) || message.role !== 'assistant') continue;
		for (const part of message.content) {
			if (part.type !== 'tool-call' || part.toolName !== SKILL_LOAD_TOOL_NAME) continue;
			if (!isPlainObject(part.input)) continue;
			// load_skill accepts the skill id as `skillId` or `name`.
			const id = part.input.skillId ?? part.input.name;
			if (typeof id === 'string') loaded.add(id);
		}
		break;
	}
	return loaded;
}

/** Scores a set before each model call while the skill is active. */
export function whileSkillActive(skillId: string): ContextCueSetPredicate {
	return (request) => request.isSkillActive(skillId);
}

/**
 * Scores a set only in the model call right after the agent loads the skill.
 * Use it for skills that make one decision in that call, such as routing.
 */
export function whenSkillLoads(skillId: string): ContextCueSetPredicate {
	return (request) =>
		request.isSkillActive(skillId) && detectJustLoadedSkills(request.messages).has(skillId);
}

/** User text and tool inputs, searched by a cue's `requiresAny` gate. */
function threadEvidence(
	messages: readonly AgentMessage[],
	stripInjectedText: (text: string) => string,
): string {
	const chunks: string[] = [];
	for (const message of messages) {
		if (!isLlmMessage(message)) continue;
		for (const part of message.content) {
			// Injected host context can name things from elsewhere, so it cannot open a gate.
			if (part.type === 'text' && message.role === 'user') {
				chunks.push(stripInjectedText(part.text));
			}
			if (part.type === 'tool-call') chunks.push(JSON.stringify(part.input ?? null));
		}
	}
	return chunks.join('\n');
}

/**
 * Builds the retrieval query for the next model call from the latest user
 * request and the agent's latest assistant and tool activity.
 */
export function buildContextCueQuery(
	messages: readonly AgentMessage[],
	injectedTags: readonly string[] = [],
): ContextCueStepQuery {
	const stripInjectedText = createInjectedTextStripper(injectedTags);
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
				// Inputs and results can hold code, SQL and HTML: keep only what was called.
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

// Cue embeddings depend only on the model and the text, so runs share them.
const cueEmbeddingCache = new Map<string, Promise<number[]>>();

function embeddingModelKey(model: EmbeddingModel): string {
	return typeof model === 'string' ? model : `${model.provider}/${model.modelId}`;
}

async function embedCueTexts(
	model: EmbeddingModel,
	texts: string[],
	abortSignal?: AbortSignal,
): Promise<number[][]> {
	const modelKey = embeddingModelKey(model);
	const missing = [...new Set(texts)].filter(
		(text) => !cueEmbeddingCache.has(`${modelKey}\u0000${text}`),
	);
	if (missing.length > 0) {
		const { embedMany } = loadAi();
		// Other runs share this batch, so one run's cancel must not abort it.
		const batch = embedMany({ model, values: missing });
		missing.forEach((text, i) => {
			const key = `${modelKey}\u0000${text}`;
			const entry = batch.then(({ embeddings }) => embeddings[i]);
			// Let the next call retry instead of caching the failure.
			entry.catch(() => cueEmbeddingCache.delete(key));
			cueEmbeddingCache.set(key, entry);
		});
	}
	const all = Promise.all(
		texts.map(async (text) => {
			const entry = cueEmbeddingCache.get(`${modelKey}\u0000${text}`);
			if (!entry) throw new Error(`Missing context cue embedding for "${text}"`);
			return await entry;
		}),
	);
	return await waitUnlessAborted(all, abortSignal);
}

/** Waits for a shared promise, but stops waiting when this caller's run is cancelled. */
async function waitUnlessAborted<T>(promise: Promise<T>, abortSignal?: AbortSignal): Promise<T> {
	if (!abortSignal) return await promise;
	abortSignal.throwIfAborted();
	let onAbort: (() => void) | undefined;
	const aborted = new Promise<never>((_, reject) => {
		onAbort = () =>
			reject(abortSignal.reason instanceof Error ? abortSignal.reason : new Error('Aborted'));
		abortSignal.addEventListener('abort', onAbort, { once: true });
	});
	try {
		return await Promise.race([promise, aborted]);
	} finally {
		if (onAbort) abortSignal.removeEventListener('abort', onAbort);
	}
}

interface Candidate {
	setId: string;
	cue: ContextCue;
}

/** Scores every candidate (by index) against the query parts. */
type CueScorer = (queries: string[], abortSignal?: AbortSignal) => Promise<number[]>;

function createEmbeddingScorer(model: EmbeddingModel, candidates: readonly Candidate[]): CueScorer {
	return async (queries, abortSignal) => {
		const { cosineSimilarity, embedMany } = loadAi();
		const cueEmbeddings = await embedCueTexts(
			model,
			candidates.map(({ cue }) => cue.appliesWhen),
			abortSignal,
		);
		const { embeddings } = await embedMany({ model, values: queries, abortSignal });
		return cueEmbeddings.map((embedding) =>
			Math.max(...embeddings.map((query) => cosineSimilarity(query, embedding))),
		);
	};
}

function createBm25Scorer(
	candidates: readonly Candidate[],
	stopwords: readonly string[],
): CueScorer {
	// The cue text adds the exact code terms that steps contain.
	const index = createBm25Index(
		candidates.map(({ cue }, i) => ({
			key: i,
			text: `${cue.appliesWhen} ${cue.text}`,
		})),
		stopwords,
	);
	return async (queries) => {
		const perQuery = queries.map((query) => index.score(query));
		return candidates.map((_, i) => Math.max(0, ...perQuery.map((scores) => scores.get(i) ?? 0)));
	};
}

/**
 * Returns a context cue provider that adds the cues of active sets
 * whose `appliesWhen` is close to the current step: by embedding similarity
 * when an embedding model is set, else by BM25.
 *
 * Cue embeddings are cached across runs. Each distinct query is scored
 * once; repeated model calls with no new activity reuse the last result.
 */
export function createContextCueProvider(options: ContextCueProviderOptions): ContextCueProvider {
	let threshold =
		options.threshold ??
		(options.embeddingModel
			? DEFAULT_CONTEXT_CUE_EMBEDDING_THRESHOLD
			: DEFAULT_CONTEXT_CUE_BM25_THRESHOLD);
	const topK = options.topK ?? DEFAULT_CONTEXT_CUE_TOP_K;
	const ablated = options.ablate ?? new Set<string>();
	const injectedTags = options.injectedTags ?? [];
	const stripInjectedText = createInjectedTextStripper(injectedTags);

	const candidates: Candidate[] = options.sets.flatMap((set) =>
		set.cues.filter((cue) => !isAblated(cue.id, ablated)).map((cue) => ({ setId: set.id, cue })),
	);
	const byKey = new Map(candidates.map((item) => [`${item.setId}:${item.cue.id}`, item]));

	let method: ContextCueRetrievalMethod = options.embeddingModel ? 'embedding' : 'bm25';
	let bm25Scorer: CueScorer | undefined;
	const getBm25Scorer = () =>
		(bm25Scorer ??= createBm25Scorer(candidates, options.stopwords ?? []));
	const embeddingScorer = options.embeddingModel
		? createEmbeddingScorer(options.embeddingModel, candidates)
		: undefined;

	// If embedding fails (blocked proxy, bad key), rank with BM25 for the rest of the run.
	const scorer: CueScorer = async (queries, abortSignal) => {
		if (method === 'embedding' && embeddingScorer) {
			try {
				return await embeddingScorer(queries, abortSignal);
			} catch (error) {
				if (abortSignal?.aborted) throw error;
				method = 'bm25';
				threshold = options.threshold ?? DEFAULT_CONTEXT_CUE_BM25_THRESHOLD;
				options.onEmbeddingFailure?.(error);
			}
		}
		return await getBm25Scorer()(queries, abortSignal);
	};

	let lastQueryKey: string | undefined;
	let lastScores: ContextCueMatch[] = [];

	return async (request: ContextCueRequest): Promise<ContextCueEntry[]> => {
		const active = new Set(
			options.sets.filter((set) => set.isActive?.(request) ?? true).map((set) => set.id),
		);
		if (active.size === 0) return [];

		const query = buildContextCueQuery(request.messages, injectedTags);
		const queries = [query.intent, query.step].filter((text) => text.trim());
		if (queries.length === 0) return [];

		const queryKey = queries.join('\u0000');
		if (queryKey !== lastQueryKey) {
			// Each cue takes its best score against either query part, so a long
			// user request does not dilute a specific step (and vice versa).
			const scores = await scorer(queries, request.abortSignal);
			lastScores = candidates.map(({ setId, cue }, i) => ({
				setId,
				cueId: cue.id,
				score: scores[i],
			}));
			lastQueryKey = queryKey;
		}

		// A cue for a later phase stays unsent, so it can still fire once that phase starts.
		const phases = options.detectPhases?.(request.messages) ?? new Set<string>();
		let evidence: string | undefined;
		const requirementMet = (required: readonly string[] | undefined) => {
			if (!required?.length) return true;
			evidence ??= threadEvidence(request.messages, stripInjectedText);
			return required.some((needle) => evidence?.includes(needle));
		};
		const ranked = lastScores
			.filter(({ setId, cueId }) => {
				if (!active.has(setId)) return false;
				if (request.sentCueIds.has(contextCueId(setId, cueId))) return false;
				const cue = byKey.get(`${setId}:${cueId}`)?.cue;
				if (cue?.phase !== undefined && !phases.has(cue.phase)) return false;
				// A gate that is not met yet keeps the cue unsent, like a later phase.
				return requirementMet(cue?.requiresAny);
			})
			.sort((a, b) => b.score - a.score);
		const matches = ranked.filter(({ score }) => score >= threshold).slice(0, topK);
		options.onRetrieval?.({
			method,
			query,
			matches,
			nearMisses: ranked.filter(({ score }) => score < threshold).slice(0, 3),
		});

		return matches.flatMap(({ setId, cueId }) => {
			const item = byKey.get(`${setId}:${cueId}`);
			return item ? [{ id: contextCueId(setId, cueId), content: item.cue.text }] : [];
		});
	};
}
