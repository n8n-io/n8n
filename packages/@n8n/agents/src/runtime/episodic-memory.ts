import { embed, embedMany } from 'ai';
import { createHash } from 'crypto';
import { z } from 'zod';

import type { AgentEventBus } from './event-bus';
import { normalizeFlatReflectionActions } from './memory-lifecycle';
import { renderObservationLog } from './observation-log-renderer';
import { Tool } from '../sdk/tool';
import type {
	BuiltEpisodicMemoryStore,
	BuiltMemory,
	EpisodicMemoryConfig,
	EpisodicMemoryEntry,
	EpisodicMemoryExtractionCandidate,
	EpisodicMemoryReflection,
	EpisodicMemoryReflectionMerge,
	EpisodicMemoryScope,
	EpisodicMemorySearchOptions,
	RetrievedEpisodicMemoryEntry,
} from '../types';
import { AgentEvent } from '../types/runtime/event';
import type { AgentPersistenceOptions } from '../types/sdk/agent';
import type { ObservationLogEntry, ObservationLogScope } from '../types/sdk/observation-log';

export const RECALL_MEMORY_TOOL_NAME = 'recall_memory';

const DEFAULT_TOP_K = 5;
const DEFAULT_HALF_LIFE_DAYS = 180;
const DEFAULT_MAX_ENTRIES_PER_RUN = 5;
const DEFAULT_MAX_ENTRY_LENGTH = 800;
const DEFAULT_RECALL_MEMORY_TOOL_INSTRUCTION =
	'Episodic memory is enabled. Only call recall_memory when the user explicitly asks about prior conversations, earlier decisions, remembered details, previous sessions/work, similar historical situations, exact names, prior artifacts, or complete lists/inventories of what was established before. Use recall_memory to find related prior entries; it does not answer from memory. Treat returned results as prior or historical candidate context, not current-thread truth. The current user message, current thread history, and current observations outrank recall results. Do not call recall_memory for normal current-thread questions, thin current context, missing current information, or as a fallback for missing current context.';
const RRF_K = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENCY_RRF_WEIGHT = 1;

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
			recencyFactor: z.number(),
			finalScore: z.number(),
		}),
	),
});

type RecallMemoryOutput = z.infer<typeof RecallMemoryOutputSchema>;

interface NormalizedEpisodicMemoryConfig {
	topK: number;
	halfLifeDays: number;
	maxEntriesPerRun: number;
	maxEntryLength: number;
	embedder: NonNullable<EpisodicMemoryConfig['embedder']>;
	embeddingModel: string;
	extract: EpisodicMemoryConfig['extract'];
	reflect: EpisodicMemoryConfig['reflect'];
	recallToolInstruction: string;
}

export interface RunEpisodicMemoryIndexerOpts {
	memory: BuiltMemory & BuiltEpisodicMemoryStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
	observationScope: ObservationLogScope;
	threadId: string;
	now?: Date;
	eventBus: AgentEventBus;
}

export type RunEpisodicMemoryIndexerResult =
	| { status: 'skipped'; reason: 'disabled' | 'no-extract' | 'no-observations' }
	| { status: 'ran'; entriesWritten: number; observationsIndexed: number };

export function isEpisodicMemoryEnabled(
	config: EpisodicMemoryConfig | undefined,
): config is EpisodicMemoryConfig {
	return config !== undefined && config.enabled !== false;
}

export function hasEpisodicMemoryStore(
	memory: BuiltMemory,
): memory is BuiltMemory & BuiltEpisodicMemoryStore {
	return (
		typeof Reflect.get(memory, 'saveEpisodicMemoryEntries') === 'function' &&
		typeof Reflect.get(memory, 'saveEpisodicMemoryEntrySources') === 'function' &&
		typeof Reflect.get(memory, 'searchEpisodicMemoryEntries') === 'function' &&
		typeof Reflect.get(memory, 'supersedeEpisodicMemoryEntries') === 'function' &&
		typeof Reflect.get(memory, 'getEpisodicMemoryEntrySources') === 'function' &&
		typeof Reflect.get(memory, 'applyEpisodicMemoryReflection') === 'function' &&
		typeof Reflect.get(memory, 'getEpisodicMemoryCursor') === 'function' &&
		typeof Reflect.get(memory, 'setEpisodicMemoryCursor') === 'function'
	);
}

export function withEpisodicMemoryDefaults(
	config: EpisodicMemoryConfig,
): NormalizedEpisodicMemoryConfig {
	if (!config.embedder) {
		throw new Error(
			'Episodic memory requires an embedding model supplied by the SDK consumer. Pass a Vercel AI SDK EmbeddingModel as episodicMemory.embedder.',
		);
	}

	return {
		topK: config.topK ?? DEFAULT_TOP_K,
		halfLifeDays: config.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS,
		maxEntriesPerRun: config.maxEntriesPerRun ?? DEFAULT_MAX_ENTRIES_PER_RUN,
		maxEntryLength: config.maxEntryLength ?? DEFAULT_MAX_ENTRY_LENGTH,
		embedder: config.embedder,
		embeddingModel: config.embeddingModel ?? 'custom',
		extract: config.extract,
		reflect: config.reflect,
		recallToolInstruction:
			config.prompts?.recallToolInstruction ?? DEFAULT_RECALL_MEMORY_TOOL_INSTRUCTION,
	};
}

export async function runEpisodicMemoryIndexer(
	opts: RunEpisodicMemoryIndexerOpts,
): Promise<RunEpisodicMemoryIndexerResult> {
	if (!isEpisodicMemoryEnabled(opts.config)) return { status: 'skipped', reason: 'disabled' };

	try {
		const normalized = withEpisodicMemoryDefaults(opts.config);
		if (!normalized.extract) return { status: 'skipped', reason: 'no-extract' };

		const observations = await getNewActiveObservations(opts.memory, opts.observationScope);
		if (observations.length === 0) return { status: 'skipped', reason: 'no-observations' };

		const renderedObservations = renderObservationLog(observations) ?? '';
		const existingEntries = await opts.memory.searchEpisodicMemoryEntries(
			opts.scope,
			observations.map((entry) => entry.text).join('\n'),
			{ topK: Math.max(normalized.topK, 20), halfLifeDays: normalized.halfLifeDays },
		);

		const extraction = await normalized.extract({
			scope: opts.scope,
			observationScope: opts.observationScope,
			now: opts.now ?? new Date(),
			observations,
			renderedObservations,
			existingEntries,
		});

		const candidates = validateCandidates(
			extraction.entries,
			observations,
			normalized.maxEntryLength,
		).slice(0, normalized.maxEntriesPerRun);

		const savedEntries: EpisodicMemoryEntry[] = [];
		if (candidates.length > 0) {
			const { embeddings } = await embedMany({
				model: normalized.embedder,
				values: candidates.map((entry) => entry.content),
			});
			for (const [index, candidate] of candidates.entries()) {
				const saved = await saveCandidate(opts, normalized, candidate, embeddings[index]);
				if (saved) savedEntries.push(saved);
			}
		}

		await advanceEpisodicCursor(opts.memory, opts.observationScope, observations);
		if (savedEntries.length > 0 && normalized.reflect) {
			await runEpisodicMemoryReflection(opts, normalized, savedEntries, observations);
		}
		return {
			status: 'ran',
			entriesWritten: savedEntries.length,
			observationsIndexed: observations.length,
		};
	} catch (error) {
		opts.eventBus.emit({
			type: AgentEvent.Error,
			message: 'Episodic memory indexing failed',
			error,
			source: 'episodic-memory',
		});
		throw error;
	}
}

export function createRecallMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
}) {
	const normalized = withEpisodicMemoryDefaults(opts.config);

	return new Tool(RECALL_MEMORY_TOOL_NAME)
		.description(
			'Recall source-backed prior-session entries for explicit asks about previous conversations, earlier decisions, exact names, prior artifacts, remembered details, or similar historical situations.',
		)
		.systemInstruction(normalized.recallToolInstruction)
		.input(RecallMemoryInputSchema)
		.output(RecallMemoryOutputSchema)
		.handler(async ({ query }): Promise<RecallMemoryOutput> => {
			const { embedding: queryEmbedding } = await embed({
				model: normalized.embedder,
				value: query,
			});
			const entries = await opts.memory.searchEpisodicMemoryEntries(opts.scope, query, {
				topK: normalized.topK,
				halfLifeDays: normalized.halfLifeDays,
				queryEmbedding,
			});
			return { entries: entries.map(toRecallToolEntry) };
		})
		.toModelOutput((output) => ({
			entries: output.entries.map((entry) => ({
				...entry,
				content: `Prior/historical entry: ${entry.content}`,
			})),
		}))
		.build();
}

export function rankEpisodicMemoryEntries(
	entries: EpisodicMemoryEntry[],
	query: string,
	opts: EpisodicMemorySearchOptions = {},
): RetrievedEpisodicMemoryEntry[] {
	const topK = opts.topK ?? DEFAULT_TOP_K;
	const statuses = new Set(opts.includeStatuses ?? ['active']);
	const candidates = entries.filter((entry) => statuses.has(entry.status));
	const queryTokens = tokenize(query);
	const lexical = candidates
		.map((entry) => ({ entry, score: lexicalScore(queryTokens, tokenize(entry.content)) }))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score);
	const vector = candidates
		.map((entry) => ({
			entry,
			score:
				opts.queryEmbedding && entry.embedding
					? cosineSimilarity(opts.queryEmbedding, entry.embedding)
					: 0,
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score);
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
		.map((score) => {
			const recencyFactor = computeRecencyFactor(
				getEntryRecencyDate(score.entry),
				opts.halfLifeDays,
			);
			const baseScore = score.rrfScore > 0 ? score.rrfScore : recencyFactor * 0.0001;
			return {
				...score.entry,
				lexicalScore: score.lexicalScore,
				vectorScore: score.vectorScore,
				rrfScore: score.rrfScore,
				recencyFactor,
				finalScore: baseScore * recencyFactor,
			};
		})
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

function requireEpisodicMemoryScope(
	persistence: AgentPersistenceOptions | undefined,
): EpisodicMemoryScope | null {
	if (!persistence?.agentId || !persistence.resourceId) return null;
	return { agentId: persistence.agentId, resourceId: persistence.resourceId };
}

export function getEpisodicMemoryScope(
	persistence: AgentPersistenceOptions | undefined,
): EpisodicMemoryScope | null {
	return requireEpisodicMemoryScope(persistence);
}

async function getNewActiveObservations(
	memory: BuiltMemory & BuiltEpisodicMemoryStore,
	scope: ObservationLogScope,
): Promise<ObservationLogEntry[]> {
	if (
		!('getActiveObservationLog' in memory) ||
		typeof memory.getActiveObservationLog !== 'function'
	) {
		return [];
	}
	const observationMemory = memory as BuiltMemory &
		BuiltEpisodicMemoryStore & {
			getActiveObservationLog(
				scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
			): Promise<ObservationLogEntry[]>;
		};
	const [cursor, active] = await Promise.all([
		memory.getEpisodicMemoryCursor(scope),
		observationMemory.getActiveObservationLog({ ...scope, order: 'asc' }),
	]);
	if (!cursor) return active;
	return active.filter(
		(entry) =>
			compareKeyset(
				{ createdAt: entry.createdAt, id: entry.id },
				{
					createdAt: cursor.lastIndexedObservationCreatedAt,
					id: cursor.lastIndexedObservationId,
				},
			) > 0,
	);
}

async function saveCandidate(
	opts: RunEpisodicMemoryIndexerOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidate: ValidatedCandidate,
	embedding: number[],
): Promise<EpisodicMemoryEntry | null> {
	const now = opts.now ?? new Date();
	const [entry] = await opts.memory.saveEpisodicMemoryEntries([
		{
			...opts.scope,
			content: candidate.content,
			contentHash: hashEpisodicMemoryContent(candidate.content),
			embedding,
			embeddingModel: config.embeddingModel,
			createdAt: now,
			lastSeenAt: now,
		},
	]);
	if (!entry) return null;

	await opts.memory.saveEpisodicMemoryEntrySources(
		candidate.sources.map((source) => ({
			memoryEntryId: entry.id,
			observationId: source.observationId,
			threadId: opts.threadId,
			evidenceText: source.evidence,
			createdAt: now,
		})),
	);
	return entry;
}

async function runEpisodicMemoryReflection(
	opts: RunEpisodicMemoryIndexerOpts,
	config: NormalizedEpisodicMemoryConfig,
	savedEntries: EpisodicMemoryEntry[],
	observations: ObservationLogEntry[],
): Promise<void> {
	if (!config.reflect) return;
	const cluster = await buildReflectionCluster(opts, config, savedEntries, observations);
	if (cluster.length === 0) return;

	const sources = await opts.memory.getEpisodicMemoryEntrySources(cluster.map((entry) => entry.id));
	const reflection = normalizeEpisodicMemoryReflection(
		cluster,
		await config.reflect({
			scope: opts.scope,
			now: opts.now ?? new Date(),
			seedEntryIds: savedEntries.map((entry) => entry.id),
			entries: cluster,
			sources,
		}),
		config.maxEntryLength,
	);
	if (reflection.drop.length === 0 && reflection.merge.length === 0) return;

	const mergeContents = reflection.merge.map((entry) => entry.content);
	const mergeEmbeddings =
		mergeContents.length > 0
			? (
					await embedMany({
						model: config.embedder,
						values: mergeContents,
					})
				).embeddings
			: [];
	await opts.memory.applyEpisodicMemoryReflection(opts.scope, {
		drop: reflection.drop,
		merge: reflection.merge.map((merge, index) => ({
			supersedes: merge.supersedes,
			entry: {
				...opts.scope,
				content: merge.content,
				contentHash: hashEpisodicMemoryContent(merge.content),
				embedding: mergeEmbeddings[index],
				embeddingModel: config.embeddingModel,
				createdAt: opts.now ?? new Date(),
				lastSeenAt: opts.now ?? new Date(),
			},
		})),
	});
}

async function buildReflectionCluster(
	opts: RunEpisodicMemoryIndexerOpts,
	config: NormalizedEpisodicMemoryConfig,
	savedEntries: EpisodicMemoryEntry[],
	observations: ObservationLogEntry[],
): Promise<RetrievedEpisodicMemoryEntry[]> {
	const query = [
		...savedEntries.map((entry) => entry.content),
		...observations.map((entry) => entry.text),
	].join('\n');
	const related = await opts.memory.searchEpisodicMemoryEntries(opts.scope, query, {
		topK: Math.max(config.topK, 20),
		halfLifeDays: config.halfLifeDays,
	});
	const relatedById = new Map(related.map((entry) => [entry.id, entry]));
	for (const saved of savedEntries) {
		if (saved.status !== 'active' || relatedById.has(saved.id)) continue;
		relatedById.set(saved.id, toRetrievedEntry(saved));
	}
	return [...relatedById.values()];
}

function normalizeEpisodicMemoryReflection(
	activeEntries: EpisodicMemoryEntry[],
	reflection: EpisodicMemoryReflection,
	maxEntryLength: number,
): EpisodicMemoryReflection {
	const activeIds = new Set(
		activeEntries.filter((entry) => entry.status === 'active').map((entry) => entry.id),
	);
	return normalizeFlatReflectionActions<
		EpisodicMemoryReflectionMerge,
		EpisodicMemoryReflectionMerge
	>({
		activeIds,
		drop: reflection.drop,
		merge: reflection.merge,
		normalizeMerge: (entry, supersedes) => {
			const content = normalizeEntryContent(entry.content, maxEntryLength);
			return content ? { supersedes, content } : null;
		},
	});
}

async function advanceEpisodicCursor(
	memory: BuiltMemory & BuiltEpisodicMemoryStore,
	scope: ObservationLogScope,
	observations: ObservationLogEntry[],
): Promise<void> {
	const last = observations.at(-1);
	if (!last) return;
	await memory.setEpisodicMemoryCursor({
		...scope,
		lastIndexedObservationId: last.id,
		lastIndexedObservationCreatedAt: last.createdAt,
	});
}

interface ValidatedCandidate {
	content: string;
	sources: Array<{
		observationId: string;
		evidence: string;
	}>;
}

function validateCandidates(
	candidates: EpisodicMemoryExtractionCandidate[],
	observations: ObservationLogEntry[],
	maxEntryLength: number,
): ValidatedCandidate[] {
	const observationsById = new Map(observations.map((entry) => [entry.id, entry]));
	const valid: ValidatedCandidate[] = [];
	for (const candidate of candidates) {
		const sourceKeys = new Set<string>();
		const sources = candidate.sources.flatMap((source) => {
			const evidence = source.evidence.trim();
			if (!evidence) return [];
			const observation = observationsById.get(source.observationId);
			if (!observation?.text.includes(evidence)) return [];
			const key = `${source.observationId}\n${evidence}`;
			if (sourceKeys.has(key)) return [];
			sourceKeys.add(key);
			return [{ observationId: source.observationId, evidence }];
		});
		if (sources.length === 0) continue;
		const content = normalizeEntryContent(candidate.content, maxEntryLength);
		if (!content) continue;
		const evidenceText = sources.map((source) => source.evidence).join('\n');
		const sourceText = sources
			.map((source) => observationsById.get(source.observationId)?.text ?? '')
			.join('\n');
		if (isFailedRecallCandidate(content, evidenceText, sourceText)) continue;
		valid.push({
			content,
			sources,
		});
	}
	return valid;
}

function isFailedRecallCandidate(content: string, evidence: string, sourceText: string): boolean {
	const text = `${content}\n${evidence}\n${sourceText}`.toLowerCase();
	if (!/\b(memory|recall|prior notes|saved decisions)\b/.test(text)) return false;

	return [
		/no (?:entries|memory entries|prior notes|saved decisions|matching memory entries) (?:were )?found/,
		/queried memory[^.]*no entries/,
		/memory lookup[^.]*no saved/,
		/could not (?:reliably )?(?:recover|confirm|recall)/,
		/re-establish(?:ing)? .* baseline/,
	].some((pattern) => pattern.test(text));
}

function normalizeEntryContent(content: string, maxLength: number): string {
	const normalized = content.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) return normalized;
	return normalized.slice(0, maxLength).trim();
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

function computeRecencyFactor(createdAt: Date, halfLifeDays = DEFAULT_HALF_LIFE_DAYS): number {
	const ageMs = Math.max(0, Date.now() - createdAt.getTime());
	const ageDays = ageMs / MS_PER_DAY;
	return Math.pow(0.5, ageDays / halfLifeDays);
}

function compareKeyset(
	a: { createdAt: Date; id: string },
	b: { createdAt: Date; id: string },
): number {
	const t = a.createdAt.getTime() - b.createdAt.getTime();
	if (t !== 0) return t;
	return a.id.localeCompare(b.id);
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
		recencyFactor: entry.recencyFactor,
		finalScore: entry.finalScore,
	};
}

function toRetrievedEntry(entry: EpisodicMemoryEntry): RetrievedEpisodicMemoryEntry {
	return {
		...entry,
		lexicalScore: 0,
		vectorScore: 0,
		rrfScore: 0,
		recencyFactor: 1,
		finalScore: 0,
	};
}
