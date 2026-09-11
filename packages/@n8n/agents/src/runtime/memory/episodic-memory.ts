import { createHash } from 'crypto';
import { z } from 'zod';

import {
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
	DEFAULT_EPISODIC_MEMORY_RECALL_TOOL_INSTRUCTION,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
} from './episodic-memory-defaults';
import { hasFunctionProperty } from './observation-log-store';
import { isAbortError } from '../../sdk/abort';
import { Tool } from '../../sdk/tool';
import type {
	BuiltEpisodicMemoryCaptureStore,
	BuiltEpisodicMemoryStore,
	BuiltMemory,
	EpisodicMemoryConfig,
	EpisodicMemoryEntry,
	EpisodicMemoryScope,
	EpisodicMemorySearchOptions,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import type { AgentExecutionCounter, AgentPersistenceOptions } from '../../types/sdk/agent';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';

export const RECALL_MEMORY_TOOL_NAME = 'recall_memory';

const RRF_K = 60;
// Recency breaks ties between comparably relevant entries. At full weight it
// outranks relevance once entries share most tokens, so old relevant entries
// fall out of topK behind recent unrelated ones.
const RECENCY_RRF_WEIGHT = 0.25;
const CAPTURE_STORE_METHODS = [
	'enqueueCaptureCandidate',
	'getPendingCaptureCandidates',
	'completeCaptureCandidates',
	'recordCaptureCandidateFailure',
] as const;

const RecallMemoryInputSchema = z.object({
	query: z.string().min(1),
});

const RecallMemoryOutputSchema = z.object({
	entries: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			createdAt: z.string(),
			lexicalScore: z.number(),
			vectorScore: z.number(),
			rrfScore: z.number(),
			finalScore: z.number(),
		}),
	),
});

type RecallMemoryOutput = z.infer<typeof RecallMemoryOutputSchema>;

export interface NormalizedEpisodicMemoryConfig {
	topK: number;
	maxEntriesPerRun: number;
	embedder: NonNullable<EpisodicMemoryConfig['embedder']>;
	embeddingModel: string;
	reflect: EpisodicMemoryConfig['reflect'];
	recallToolInstruction: string;
}

export function isEpisodicMemoryEnabled(
	config: EpisodicMemoryConfig | undefined,
): config is EpisodicMemoryConfig {
	return config !== undefined && config.enabled !== false;
}

export function hasEpisodicMemoryStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltEpisodicMemoryStore {
	const episodic = memory.episodic;
	return (
		episodic !== undefined &&
		typeof episodic.saveEntryWithSources === 'function' &&
		typeof episodic.searchEntries === 'function' &&
		typeof episodic.getEntrySources === 'function' &&
		typeof episodic.applyReflection === 'function'
	);
}

export function hasEpisodicMemoryCaptureStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltEpisodicMemoryStore & BuiltEpisodicMemoryCaptureStore {
	if (!hasEpisodicMemoryStore(memory)) return false;
	return CAPTURE_STORE_METHODS.every((method) => hasFunctionProperty(memory.episodic, method));
}

export function withEpisodicMemoryDefaults(
	config: EpisodicMemoryConfig,
): NormalizedEpisodicMemoryConfig {
	if (!config.embedder) {
		throw new Error('Episodic memory requires a resolved embedding model before runtime use.');
	}

	return {
		topK: config.topK ?? DEFAULT_EPISODIC_MEMORY_TOP_K,
		maxEntriesPerRun: config.maxEntriesPerRun ?? DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
		embedder: config.embedder,
		embeddingModel: config.embeddingModel ?? 'custom',
		reflect: config.reflect,
		recallToolInstruction:
			config.prompts?.recallToolInstruction ?? DEFAULT_EPISODIC_MEMORY_RECALL_TOOL_INSTRUCTION,
	};
}

/**
 * Provider errors from the embedder arrive as bare messages such as "Not Found".
 * Name the failing component so the tool step and logs point at the fix.
 */
export async function withEmbeddingErrorContext<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (isAbortError(error)) throw error;
		const status =
			error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
				? ` (HTTP ${error.statusCode})`
				: '';
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Episodic memory embedding request failed${status}: ${message}. Check the episodic memory embedding credential and model.`,
			{ cause: error },
		);
	}
}

export function createRecallMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
	executionCounter?: AgentExecutionCounter;
	agentName?: string;
}) {
	const normalized = withEpisodicMemoryDefaults(opts.config);

	return new Tool(RECALL_MEMORY_TOOL_NAME)
		.description(
			'Recall source-backed prior-session entries for explicit asks about previous conversations, earlier decisions, exact names, prior artifacts, remembered details, or similar historical situations.',
		)
		.systemInstruction(normalized.recallToolInstruction)
		.input(RecallMemoryInputSchema)
		.output(RecallMemoryOutputSchema)
		.handler(async ({ query }, ctx): Promise<RecallMemoryOutput> => {
			const { embed } = await import('ai');
			const { embedding: queryEmbedding, usage } = await withEmbeddingErrorContext(
				async () =>
					await embed({
						model: normalized.embedder,
						value: query,
						abortSignal: ctx.abortSignal,
					}),
			);
			incrementTokenCountFromUsage(opts.executionCounter, usage);
			return await withMemorySpan(
				'query_memory',
				opts.agentName ?? 'agent',
				ctx.parentTelemetry,
				() => ({
					types: ['agent'],
					owners: [opts.scope.resourceId],
					...inferMemoryStoreAttributes(opts.memory),
				}),
				async () => {
					const entries = await opts.memory.episodic.searchEntries(opts.scope, query, {
						topK: normalized.topK,
						queryEmbedding,
					});
					return {
						result: { entries: entries.map(toRecallToolEntry) },
						attributes: {
							ids: entries.map((entry) => entry.id),
							operations: entries.map(() => 'query_memory' as const),
						},
					};
				},
			);
		})
		.toModelOutput((output) => ({
			entries: output.entries.map((entry) => ({
				content: `Prior/historical entry: ${entry.content}`,
				createdAt: entry.createdAt,
			})),
		}))
		.build();
}

export function rankEpisodicMemoryEntries(
	entries: EpisodicMemoryEntry[],
	query: string,
	opts: EpisodicMemorySearchOptions = {},
): RetrievedEpisodicMemoryEntry[] {
	const topK = opts.topK ?? DEFAULT_EPISODIC_MEMORY_TOP_K;
	const statuses = new Set(opts.includeStatuses ?? ['active']);
	const candidates = entries.filter((entry) => statuses.has(entry.status));
	const queryTokens = tokenize(query);
	const lexical = candidates
		.map((entry) => ({ entry, score: lexicalScore(queryTokens, tokenize(entry.content)) }))
		.filter((item) => item.score > 0)
		.sort(compareScoredEntries);
	// No absolute similarity cutoff: with small embedding models, scores of
	// same-customer entries cluster in a narrow band, so a fixed gate drops the
	// best match as often as noise. topK bounds the result instead.
	const vector = candidates
		.map((entry) => ({
			entry,
			score:
				opts.queryEmbedding && entry.embedding
					? cosineSimilarity(opts.queryEmbedding, entry.embedding)
					: 0,
		}))
		.filter((item) => item.score > 0)
		.sort(compareScoredEntries);
	const relevantIds = new Set([
		...lexical.map((item) => item.entry.id),
		...vector.map((item) => item.entry.id),
	]);
	const recency = candidates
		.filter((entry) => relevantIds.has(entry.id))
		.sort((a, b) => getEntryRecencyDate(b).getTime() - getEntryRecencyDate(a).getTime());
	const scores = new Map<
		string,
		{ entry: EpisodicMemoryEntry; lexicalScore: number; vectorScore: number; rrfScore: number }
	>();
	for (const entry of candidates) {
		scores.set(entry.id, { entry, lexicalScore: 0, vectorScore: 0, rrfScore: 0 });
	}
	for (let rank = 0; rank < lexical.length; rank++) {
		const score = scores.get(lexical[rank].entry.id);
		if (!score) continue;
		score.lexicalScore = lexical[rank].score;
		score.rrfScore += 1 / (RRF_K + rank + 1);
	}
	for (let rank = 0; rank < vector.length; rank++) {
		const score = scores.get(vector[rank].entry.id);
		if (!score) continue;
		score.vectorScore = vector[rank].score;
		score.rrfScore += 1 / (RRF_K + rank + 1);
	}
	for (let rank = 0; rank < recency.length; rank++) {
		const score = scores.get(recency[rank].id);
		if (!score) continue;
		score.rrfScore += RECENCY_RRF_WEIGHT / (RRF_K + rank + 1);
	}
	return [...scores.values()]
		.filter((score) => score.rrfScore > 0)
		.map((score) => ({
			...score.entry,
			lexicalScore: score.lexicalScore,
			vectorScore: score.vectorScore,
			rrfScore: score.rrfScore,
			finalScore: score.rrfScore,
		}))
		.sort(
			(a, b) =>
				b.finalScore - a.finalScore ||
				getEntryRecencyDate(b).getTime() - getEntryRecencyDate(a).getTime(),
		)
		.slice(0, topK);
}

export function hashEpisodicMemoryContent(content: string): string {
	return createHash('sha256').update(normalizeHashContent(content)).digest('hex');
}

export function hashEpisodicMemoryEvidence(evidenceText: string): string {
	return createHash('sha256').update(normalizeHashContent(evidenceText)).digest('hex');
}

function requireEpisodicMemoryScope(
	persistence: AgentPersistenceOptions | undefined,
): EpisodicMemoryScope | null {
	if (!persistence?.resourceId) return null;
	return { resourceId: persistence.resourceId };
}

export function getEpisodicMemoryScope(
	persistence: AgentPersistenceOptions | undefined,
): EpisodicMemoryScope | null {
	return requireEpisodicMemoryScope(persistence);
}

function normalizeHashContent(content: string): string {
	return content.replace(/\s+/g, ' ').trim().toLowerCase();
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9_@./-]+/i)
		.map((token) => token.trim())
		.filter((token) => token.length > 1);
}

function lexicalScore(queryTokens: string[], entryTokens: string[]): number {
	if (queryTokens.length === 0 || entryTokens.length === 0) return 0;
	const entryTokenSet = new Set(entryTokens);
	const matches = queryTokens.filter((token) => entryTokenSet.has(token)).length;
	return matches / Math.sqrt(entryTokens.length);
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let dot = 0;
	let aMagnitude = 0;
	let bMagnitude = 0;
	for (let index = 0; index < a.length; index++) {
		dot += a[index] * b[index];
		aMagnitude += a[index] * a[index];
		bMagnitude += b[index] * b[index];
	}
	if (aMagnitude === 0 || bMagnitude === 0) return 0;
	return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

function getEntryRecencyDate(entry: Pick<EpisodicMemoryEntry, 'createdAt' | 'lastSeenAt'>): Date {
	return entry.lastSeenAt ?? entry.createdAt;
}

function compareScoredEntries(
	a: { entry: EpisodicMemoryEntry; score: number },
	b: { entry: EpisodicMemoryEntry; score: number },
): number {
	return (
		b.score - a.score ||
		getEntryRecencyDate(b.entry).getTime() - getEntryRecencyDate(a.entry).getTime()
	);
}

function toRecallToolEntry(
	entry: RetrievedEpisodicMemoryEntry,
): RecallMemoryOutput['entries'][number] {
	return {
		id: entry.id,
		content: entry.content,
		createdAt: entry.createdAt.toISOString(),
		lexicalScore: entry.lexicalScore,
		vectorScore: entry.vectorScore,
		rrfScore: entry.rrfScore,
		finalScore: entry.finalScore,
	};
}
