import type {
	AgentMessage,
	ContextNote,
	ContextNoteProvider,
	ContextNoteRequest,
} from '@n8n/agents';
import type { EmbeddingModel } from 'ai';
import { cosineSimilarity, embedMany } from 'ai';

import { createBm25Index } from './gotcha-bm25';
import { isGotchaAblated, type SkillGotcha, type SkillGotchaSet } from './skill-gotchas';

/** Not tuned yet. Calibrate with eval traces (scores of notes that helped vs. noise). */
export const DEFAULT_GOTCHA_SCORE_THRESHOLD = 0.4;
/** Threshold on the normalized BM25 score. Not tuned yet. */
export const DEFAULT_GOTCHA_BM25_THRESHOLD = 0.2;
export const DEFAULT_GOTCHA_TOP_K = 3;

const MAX_INTENT_CHARS = 1_500;
const MAX_STEP_CHARS = 2_500;
const MAX_TOOL_INPUT_CHARS = 600;
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

function stringify(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return '';
	}
}

function isLlmMessage(message: AgentMessage): message is Extract<AgentMessage, { role: string }> {
	return 'role' in message && Array.isArray(message.content);
}

/** Runtime-added text (skill bodies, reminders, context) is not user intent. */
function isInjectedText(text: string): boolean {
	return /^\s*<(system-reminder|context|skill)[\s>]/i.test(text);
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
			.flatMap((part) => (part.type === 'text' && !isInjectedText(part.text) ? [part.text] : []))
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
				if (!isInjectedText(part.text)) parts.push(part.text);
			} else if (part.type === 'tool-call') {
				parts.push(`${part.toolName}(${truncate(stringify(part.input), MAX_TOOL_INPUT_CHARS)})`);
				if (part.state === 'rejected') {
					parts.push(`Error: ${truncate(part.error, MAX_TOOL_OUTPUT_CHARS)}`);
				} else if (part.state === 'resolved') {
					parts.push(`Result: ${truncate(stringify(part.output), MAX_TOOL_OUTPUT_CHARS)}`);
				}
			} else if (part.type === 'invalid-tool-call') {
				parts.push(`Invalid call ${part.name ?? ''}: ${part.error ?? ''}`);
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
	const method: GotchaRetrievalMethod = options.embeddingModel ? 'embedding' : 'bm25';
	const threshold =
		options.threshold ??
		(method === 'embedding' ? DEFAULT_GOTCHA_SCORE_THRESHOLD : DEFAULT_GOTCHA_BM25_THRESHOLD);
	const topK = options.topK ?? DEFAULT_GOTCHA_TOP_K;
	const ablated = options.ablated ?? new Set<string>();

	const candidates: Candidate[] = options.sets.flatMap((set) =>
		set.gotchas
			.filter((gotcha) => !isGotchaAblated(gotcha.id, ablated))
			.map((gotcha) => ({ skillId: set.skillId, gotcha })),
	);

	const scorer = options.embeddingModel
		? createEmbeddingScorer(options.embeddingModel, candidates)
		: createBm25Scorer(candidates);

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

		const ranked = lastScores
			.filter(
				({ skillId, gotchaId }) =>
					active.has(skillId) && !request.sentNoteIds.has(gotchaNoteId(skillId, gotchaId)),
			)
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
