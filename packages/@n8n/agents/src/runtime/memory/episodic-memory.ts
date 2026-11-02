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
	EpisodicScopeDecision,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import type { AgentExecutionCounter, AgentPersistenceOptions } from '../../types/sdk/agent';
import type { JSONObject } from '../../types/utils/json';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';

export const RECALL_MEMORY_TOOL_NAME = 'recall_memory';

const RRF_K = 60;
// Recency is a small signal. It can put a newer fact above an older one with nearly
// the same similarity. In our retrieval eval, higher weights pushed relevant entries
// out of topK behind recent unrelated ones.
const RECENCY_RRF_WEIGHT = 0.05;
// In our retrieval eval, this floor cut unrelated recall results in small scopes from
// about 4 of 5 to 0.4, kept every answer, and returned nothing for most questions
// without a stored answer. Consolidation uses its own floor.
const RECALL_MIN_SIMILARITY = 0.4;
const CAPTURE_STORE_METHODS = [
	'getEntriesByContentHashes',
	'enqueueCaptureCandidate',
	'getPendingCaptureCandidates',
	'completeCaptureCandidates',
	'recordCaptureCandidateFailure',
	'findSimilarEntries',
	'addEntrySources',
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
			vectorScore: z.number(),
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
	consolidate: EpisodicMemoryConfig['consolidate'];
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
		consolidate: config.consolidate,
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
						minSimilarity: RECALL_MIN_SIMILARITY,
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
		.toTraceOutput(toRecallTraceOutput)
		.build();
}

/** Hosts link recalled entries in traces by id; the model output drops ids. */
function toRecallTraceOutput(output: RecallMemoryOutput): { entryIds: string[] } {
	return { entryIds: output.entries.map((entry) => entry.id) };
}

/**
 * Ranks entries by similarity to the query embedding, with a small recency signal.
 * There is no keyword matching: in our retrieval eval it added nothing for exact IDs
 * and pushed paraphrase matches out of topK. Without a query embedding, nothing matches.
 */
export function rankEpisodicMemoryEntries(
	entries: EpisodicMemoryEntry[],
	opts: EpisodicMemorySearchOptions = {},
): RetrievedEpisodicMemoryEntry[] {
	const { queryEmbedding } = opts;
	if (!queryEmbedding) return [];
	const topK = opts.topK ?? DEFAULT_EPISODIC_MEMORY_TOP_K;
	const statuses = new Set(opts.includeStatuses ?? ['active']);
	const positive = entries
		.flatMap((entry) =>
			statuses.has(entry.status) && entry.embedding
				? [{ entry, score: cosineSimilarity(queryEmbedding, entry.embedding) }]
				: [],
		)
		.filter((item) => item.score > 0);
	// Rank recency before the floor. Among only the few entries above it, a corrected
	// fact and the value it replaced get nearly the same recency weight.
	const recencyRank = new Map(
		[...positive]
			.sort(
				(a, b) =>
					getEntryRecencyDate(b.entry).getTime() - getEntryRecencyDate(a.entry).getTime() ||
					b.score - a.score,
			)
			.map((item, rank) => [item.entry.id, rank]),
	);
	const minSimilarity = opts.minSimilarity ?? 0;
	return positive
		.filter(({ score }) => score >= minSimilarity)
		.sort(compareScoredEntries)
		.map(({ entry, score }, rank) => ({
			...entry,
			vectorScore: score,
			finalScore:
				1 / (RRF_K + rank + 1) +
				RECENCY_RRF_WEIGHT / (RRF_K + (recencyRank.get(entry.id) ?? 0) + 1),
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

/** `hostMetadata` key that carries the turn's resolved episodic scope through checkpoints. */
export const EPISODIC_SCOPE_METADATA_KEY = 'n8nEpisodicScope';

const resolvedEpisodicScopeSchema = z.object({
	writeScopeId: z.string().min(1),
	readScopeIds: z.array(z.string().min(1)),
});

const episodicScopeMetadataSchema = z.union([
	resolvedEpisodicScopeSchema,
	z.object({ disabled: z.literal(true) }),
]);

/** Encodes a resolved scope, or the marker that turns episodic memory off for the turn. */
export function encodeEpisodicScopeMetadata(scope: EpisodicScopeDecision): JSONObject {
	return { [EPISODIC_SCOPE_METADATA_KEY]: 'disabled' in scope ? { disabled: true } : { ...scope } };
}

/**
 * The scope decision a host carried in `hostMetadata`, or `undefined` when it
 * carried none. A host forwards it to child runs of the same turn.
 */
export function readEpisodicScopeDecision(
	hostMetadata: JSONObject | undefined,
): EpisodicScopeDecision | undefined {
	const raw = hostMetadata?.[EPISODIC_SCOPE_METADATA_KEY];
	if (raw === undefined) return undefined;
	const parsed = episodicScopeMetadataSchema.safeParse(raw);
	// A malformed value disables memory. It must not fall back to a broader scope.
	return parsed.success ? parsed.data : { disabled: true };
}

/**
 * The scope of the current turn. Returns `null` when the turn has no resource or
 * the host switched episodic memory off for it.
 */
export function getEpisodicMemoryScope(
	persistence: AgentPersistenceOptions | undefined,
): EpisodicMemoryScope | null {
	if (!persistence?.resourceId) return null;
	const { resourceId, threadId } = persistence;
	const metadata = readEpisodicScopeDecision(persistence.hostMetadata);
	if (!metadata) return { resourceId, threadId };
	if ('disabled' in metadata) return null;
	return { resourceId, threadId, episodic: metadata };
}

function normalizeHashContent(content: string): string {
	return content.replace(/\s+/g, ' ').trim().toLowerCase();
}

function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
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
		vectorScore: entry.vectorScore,
		finalScore: entry.finalScore,
	};
}
