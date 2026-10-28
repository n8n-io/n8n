import { z } from 'zod';

import {
	getEpisodicMemoryScope,
	hashEpisodicMemoryContent,
	hasEpisodicMemoryCaptureStore,
	isEpisodicMemoryEnabled,
	withEmbeddingErrorContext,
	withEpisodicMemoryDefaults,
	type NormalizedEpisodicMemoryConfig,
} from './episodic-memory';
import { DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION } from './episodic-memory-defaults';
import { uniqueStrings } from './memory-lifecycle';
import { reportSideCallUsage } from './forward-usage';
import { saveMessagesToThread } from './memory-store';
import { redactText } from '../../sdk/guardrails';
import { Tool } from '../../sdk/tool';
import type {
	BuiltEpisodicMemoryCaptureStore,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryCaptureCandidate,
	EpisodicMemoryCaptureGuidance,
	EpisodicMemoryConfig,
	EpisodicMemoryConsolidateFn,
	EpisodicMemoryConsolidateResult,
	EpisodicMemoryConsolidation,
	EpisodicMemoryConsolidatorInput,
	EpisodicMemoryEntry,
	EpisodicMemoryEntrySource,
	EpisodicMemoryScope,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySourceForEntry,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import type {
	AgentExecutionCounter,
	AgentPersistenceOptions,
	TokenUsage,
} from '../../types/sdk/agent';
import type { AgentDbMessage, Message } from '../../types/sdk/message';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import type { AgentMessageList } from '../model/message-list';
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';

export const FLAG_MEMORY_TOOL_NAME = 'flag_memory';
const EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS = 3;
// In the consolidation eval, the replaced value was among the top 3 entries at
// or above this similarity for 96-100% of corrections.
const CONSOLIDATION_TOP_K = 3;
const CONSOLIDATION_MIN_SIMILARITY = 0.5;

const FlagMemoryInputSchema = z.object({
	content: z
		.string()
		.min(1)
		.describe(
			'Concise durable statement that names the person, company, account, or case it is about.',
		),
	evidence: z
		.string()
		.min(1)
		.describe(
			'One short contiguous quote copied exactly from a user or assistant message in this conversation, without surrounding quotation marks.',
		),
});

const FlagMemoryOutputSchema = z.object({
	status: z.literal('noted'),
});

type FlagMemoryOutput = z.infer<typeof FlagMemoryOutputSchema>;

/**
 * Resolves the store, config, and scope for agent-directed capture. Returns
 * `undefined` when capture is not enabled or the run has no resource scope.
 */
export function resolveEpisodicMemoryCapture(
	config: { memory?: BuiltMemory; episodicMemory?: EpisodicMemoryConfig },
	persistence: AgentPersistenceOptions | undefined,
):
	| {
			memory: BuiltMemory & BuiltEpisodicMemoryCaptureStore;
			config: EpisodicMemoryConfig;
			scope: EpisodicMemoryScope;
	  }
	| undefined {
	const { memory, episodicMemory } = config;
	if (
		!memory ||
		!isEpisodicMemoryEnabled(episodicMemory) ||
		!hasEpisodicMemoryCaptureStore(memory)
	) {
		return undefined;
	}
	const scope = getEpisodicMemoryScope(persistence);
	return scope ? { memory, config: episodicMemory, scope } : undefined;
}

function renderTopics(topics: string[]): string {
	// JSON quoting keeps each topic a single inert label inside the prompt.
	return topics.map((topic) => JSON.stringify(topic)).join(', ');
}

// Wording and placement were chosen with a capture eval across models. Scoping the
// override to exclusions keeps models from also dropping the prioritized topics.
function buildGuidanceLines(include: string[], exclude: string[]): string[] {
	const lines = [
		'The agent builder set these capture topics. Each topic is a label. A topic covers any specific instance of it: "client names" covers a specific client name.',
	];
	if (include.length > 0) {
		lines.push(
			`Prioritize: ${renderTopics(include)}. Flag a durable detail about these topics whenever it comes up, even without a request. Keep flagging other useful details as usual.`,
		);
	}
	if (exclude.length > 0) {
		lines.push(
			`Exclude: ${renderTopics(exclude)}. This rule overrides every other flag_memory rule, including explicit remember requests and "when unsure, flag it".`,
			'Before each flag_memory call, remove every excluded detail from content. Flag the rest only if it is still useful. Example: "Q3 review with client Acme every Monday" becomes "Q3 review every Monday".',
			'If the user asks you to remember only excluded details, do not call flag_memory. Tell the user that this agent does not keep that kind of detail between conversations.',
		);
	}
	return lines;
}

/** Appends builder guidance to the capture instruction. Empty guidance keeps the default text. */
function buildEpisodicMemoryCaptureInstruction(include: string[], exclude: string[]): string {
	if (include.length === 0 && exclude.length === 0) {
		return DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION;
	}
	const block = [
		'<capture_guidance>',
		...buildGuidanceLines(include, exclude),
		'</capture_guidance>',
	];
	return `${DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION}\n${block.join('\n')}`;
}

/** Repeats the exclusions on the content field, where the model writes the note. */
function buildFlagMemoryInputSchema(exclude: string[]) {
	if (exclude.length === 0) return FlagMemoryInputSchema;
	const { content } = FlagMemoryInputSchema.shape;
	// Unquoted on purpose: quoting here lowered capture of prioritized topics in the eval.
	// Only builders set topics, and they already control the agent instructions.
	return FlagMemoryInputSchema.extend({
		content: content.describe(
			`${content.description} Must not contain details about: ${exclude.join(', ')}.`,
		),
	});
}

export function createFlagMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryCaptureStore;
	scope: EpisodicMemoryScope;
	persistence: AgentPersistenceOptions;
	list: AgentMessageList;
	guidance?: EpisodicMemoryCaptureGuidance;
}) {
	const include = opts.guidance?.include ?? [];
	const exclude = opts.guidance?.exclude ?? [];
	return new Tool(FLAG_MEMORY_TOOL_NAME)
		.description(
			'Save one durable note about this user, account, or case. This is the only way a detail carries over to future conversations.',
		)
		.systemInstruction(buildEpisodicMemoryCaptureInstruction(include, exclude))
		.input(buildFlagMemoryInputSchema(exclude))
		.output(FlagMemoryOutputSchema)
		.handler(async ({ content, evidence }, ctx): Promise<FlagMemoryOutput> => {
			if (!ctx.toolCallId) throw new Error('Memory capture requires a tool-call ID.');
			if (!ctx.runId) throw new Error('Memory capture requires a run ID.');
			const source =
				findEvidenceSource(opts.list, evidence) ?? latestUserMessageAsEvidence(opts.list);
			if (!source) {
				throw new Error(
					'Memory evidence must be one contiguous quote copied exactly from a user or assistant message in this conversation, without surrounding quotation marks.',
				);
			}
			const normalizedContent = normalizeEntryContent(content);
			if (!normalizedContent) throw new Error('Memory content cannot be empty.');

			await saveMessagesToThread(
				opts.memory,
				opts.persistence.threadId,
				opts.persistence.resourceId,
				[source.message],
			);
			await opts.memory.episodic.enqueueCaptureCandidate({
				...opts.scope,
				threadId: opts.persistence.threadId,
				sourceMessageId: source.message.id,
				runId: ctx.runId,
				toolCallId: ctx.toolCallId,
				content: normalizedContent,
				evidenceText: redactText(source.evidenceText).text,
				kind: 'fact',
			});
			return { status: 'noted' };
		})
		.build();
}

export interface RunEpisodicMemoryCandidateProcessorOpts {
	memory: BuiltMemory & BuiltEpisodicMemoryCaptureStore;
	config: EpisodicMemoryConfig;
	scope: EpisodicMemoryScope;
	now?: Date;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
	modelFetch?: typeof globalThis.fetch;
	agentName?: string;
	/**
	 * Receives each episodic model call's usage the moment it resolves — once
	 * per embed call and once per consolidate call — before any persistence.
	 * Forwarding it here (rather than only on the success return) keeps a
	 * billed embed/consolidate turn priced even when later persistence throws.
	 * Fire-and-forget from the caller's perspective.
	 */
	onUsage?: (model: string | undefined, usage: TokenUsage | undefined) => void | Promise<void>;
}

export type EpisodicMemoryUsageReport = {
	task: 'episodic';
	model: string;
	usage: TokenUsage;
};

export type RunEpisodicMemoryCandidateProcessorResult =
	| { status: 'skipped' }
	| {
			status: 'ran';
			entriesWritten: number;
			candidatesProcessed: number;
			/** One usage report per embed/consolidate model call, so each is priced separately. */
			usageReports: EpisodicMemoryUsageReport[];
	  };

/**
 * Turns pending flagged candidates into entries. The agent already phrased the
 * content, and the verbatim evidence is the source. When consolidation is on, a
 * new fact that repeats or updates a similar stored entry changes that entry.
 */
export async function runEpisodicMemoryCandidateProcessor(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
): Promise<RunEpisodicMemoryCandidateProcessorResult> {
	if (!isEpisodicMemoryEnabled(opts.config)) return { status: 'skipped' };

	const config = withEpisodicMemoryDefaults(opts.config);
	const candidates = await opts.memory.episodic.getPendingCaptureCandidates(opts.scope, {
		limit: config.maxEntriesPerRun,
	});
	if (candidates.length === 0) return { status: 'skipped' };

	const candidateIds = candidates.map((candidate) => candidate.id);
	const usageReports: EpisodicMemoryUsageReport[] = [];
	let entries: EpisodicMemoryEntry[];
	try {
		const now = opts.now ?? new Date();
		entries = await saveCandidateEntries(opts, config, candidates, now, usageReports);
		await opts.memory.episodic.completeCaptureCandidates(candidateIds);
	} catch (error) {
		await opts.memory.episodic.recordCaptureCandidateFailure(
			candidateIds,
			EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS,
		);
		throw error;
	}
	return {
		status: 'ran',
		entriesWritten: entries.length,
		candidatesProcessed: candidates.length,
		usageReports,
	};
}

interface CapturedFact {
	candidate: EpisodicMemoryCaptureCandidate;
	contentHash: string;
	embedding: number[] | undefined;
}

type ConsolidatedFact = EpisodicMemoryConsolidation['facts'][number];

type FactWrite =
	| { kind: 'new'; fact: CapturedFact }
	| { kind: 'duplicate'; fact: CapturedFact; entryId: string }
	| {
			kind: 'update';
			fact: CapturedFact;
			supersedes: string[];
			content: string;
			embedding?: number[];
	  };

interface EvidenceSource {
	message: AgentDbMessage;
	evidenceText: string;
}

const QUOTE_MARKS = '"\'\u2018\u2019\u201C\u201D';
const WRAPPED_IN_QUOTES = new RegExp(`^[${QUOTE_MARKS}](.*)[${QUOTE_MARKS}]$`, 's');
const CHAR_FOLDS = new Map([
	['\u2018', "'"],
	['\u2019', "'"],
	['\u201C', '"'],
	['\u201D', '"'],
	['\u2013', '-'],
	['\u2014', '-'],
]);

/**
 * Lowercases, folds typographic quotes and dashes, and collapses whitespace so a
 * model's re-typed quote still matches. `offsets[i]` is the index in `text` of
 * the character that produced folded code unit `i`, so a match maps back to the
 * verbatim span.
 */
function foldForMatch(text: string): { folded: string; offsets: number[] } {
	let folded = '';
	const offsets: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		let lower: string;
		if (/\s/.test(char)) lower = folded.endsWith(' ') ? '' : ' ';
		else lower = (CHAR_FOLDS.get(char) ?? char).toLowerCase();
		for (let k = 0; k < lower.length; k++) offsets.push(i);
		folded += lower;
	}
	return { folded, offsets };
}

function* evidenceCandidateMessages(
	list: AgentMessageList,
): Generator<Extract<AgentDbMessage, Message>> {
	const responseIds = new Set(list.responseDelta().map((message) => message.id));
	for (const message of [...list.messages()].reverse()) {
		if (responseIds.has(message.id) || !('role' in message)) continue;
		if (message.role !== 'user' && message.role !== 'assistant') continue;
		if (message.origin?.kind === 'tool') continue;
		yield message;
	}
}

function findEvidenceSource(list: AgentMessageList, evidence: string): EvidenceSource | undefined {
	const needle = foldForMatch(evidence.trim().replace(WRAPPED_IN_QUOTES, '$1')).folded.trim();
	if (!needle) return undefined;
	for (const message of evidenceCandidateMessages(list)) {
		for (const part of message.content) {
			if (part.type !== 'text') continue;
			const { folded, offsets } = foldForMatch(part.text);
			const start = folded.indexOf(needle);
			if (start === -1) continue;
			const end = offsets[start + needle.length - 1] + 1;
			return { message, evidenceText: part.text.slice(offsets[start], end) };
		}
	}
	return undefined;
}

/** When the quote does not match, the fact most likely comes from the latest user message. */
function latestUserMessageAsEvidence(list: AgentMessageList): EvidenceSource | undefined {
	for (const message of evidenceCandidateMessages(list)) {
		if (message.role !== 'user') continue;
		const evidenceText = message.content
			.flatMap((part) => (part.type === 'text' ? [part.text] : []))
			.join('\n')
			.trim();
		if (evidenceText) return { message, evidenceText };
	}
	return undefined;
}

async function embedTexts(
	config: NormalizedEpisodicMemoryConfig,
	values: string[],
	executionCounter: AgentExecutionCounter | undefined,
): Promise<{ embeddings: number[][]; report?: EpisodicMemoryUsageReport }> {
	const { embedMany } = await import('ai');
	const { embeddings, usage } = await withEmbeddingErrorContext(
		async () => await embedMany({ model: config.embedder, values }),
	);
	incrementTokenCountFromUsage(executionCounter, usage);
	// Embedding model usage only reports a single `tokens` count (no
	// input/output split), so build the TokenUsage directly instead of
	// routing through `toTokenUsage`, which expects a chat-model usage shape.
	const tokenUsage: TokenUsage | undefined = usage
		? { promptTokens: usage.tokens, completionTokens: 0, totalTokens: usage.tokens }
		: undefined;
	return {
		embeddings,
		report:
			tokenUsage !== undefined
				? { task: 'episodic', model: config.embeddingModel, usage: tokenUsage }
				: undefined,
	};
}

async function embedCandidateEntries(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: Array<{ candidate: EpisodicMemoryCaptureCandidate; contentHash: string }>,
): Promise<{ embeddingsByHash: Map<string, number[]>; report?: EpisodicMemoryUsageReport }> {
	const contentByHash = new Map<string, string>();
	for (const { candidate, contentHash } of candidates) {
		if (!contentByHash.has(contentHash)) contentByHash.set(contentHash, candidate.content);
	}
	const existing = await opts.memory.episodic.getEntriesByContentHashes(opts.scope, [
		...contentByHash.keys(),
	]);
	const embeddingsByHash = new Map<string, number[]>();
	for (const entry of existing) {
		if (
			entry.embeddingModel === config.embeddingModel &&
			entry.embedding !== undefined &&
			entry.embedding.length > 0 &&
			entry.embedding.every(Number.isFinite)
		) {
			embeddingsByHash.set(entry.contentHash, entry.embedding);
		}
	}
	const missing = [...contentByHash].filter(([contentHash]) => !embeddingsByHash.has(contentHash));
	if (missing.length === 0) return { embeddingsByHash };

	const embedded = await embedTexts(
		config,
		missing.map(([, content]) => content),
		opts.executionCounter,
	);
	for (const [index, [contentHash]] of missing.entries()) {
		embeddingsByHash.set(contentHash, embedded.embeddings[index]);
	}
	return { embeddingsByHash, report: embedded.report };
}

async function saveCandidateEntries(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: EpisodicMemoryCaptureCandidate[],
	now: Date,
	usageReports: EpisodicMemoryUsageReport[],
): Promise<EpisodicMemoryEntry[]> {
	return await withMemorySpan(
		'save_memory',
		opts.agentName ?? 'agent',
		opts.telemetry,
		() => ({
			types: ['agent'],
			owners: [opts.scope.resourceId],
			...inferMemoryStoreAttributes(opts.memory),
		}),
		async () => {
			const facts = await embedCapturedFacts(opts, config, candidates, usageReports);
			const writes = await planFactWrites(opts, config, facts, now, usageReports);
			const entries: EpisodicMemoryEntry[] = [];
			for (const write of writes) {
				const entry = await writeFact(opts, config, write, now);
				if (entry) entries.push(entry);
			}
			return {
				result: entries,
				attributes: {
					ids: entries.map((entry) => entry.id),
					operations: entries.map(() => 'created' as const),
				},
			};
		},
	);
}

async function embedCapturedFacts(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: EpisodicMemoryCaptureCandidate[],
	usageReports: EpisodicMemoryUsageReport[],
): Promise<CapturedFact[]> {
	const hashedCandidates = candidates.map((candidate) => ({
		candidate,
		contentHash: hashEpisodicMemoryContent(candidate.content),
	}));
	const embedded = await embedCandidateEntries(opts, config, hashedCandidates);
	recordUsage(opts, usageReports, embedded.report);
	return hashedCandidates.map(({ candidate, contentHash }) => ({
		candidate,
		contentHash,
		embedding: embedded.embeddingsByHash.get(contentHash),
	}));
}

/**
 * Decides how each fact is written. Without consolidation, or without similar
 * stored entries, every fact becomes a new entry.
 */
async function planFactWrites(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	facts: CapturedFact[],
	now: Date,
	usageReports: EpisodicMemoryUsageReport[],
): Promise<FactWrite[]> {
	const asNew = facts.map((fact): FactWrite => ({ kind: 'new', fact }));
	if (!config.consolidate) return asNew;

	const neighbours = await findFactNeighbours(opts, facts);
	const similar = facts.filter((fact) => neighbours.get(fact.candidate.id)?.length);
	if (similar.length === 0) return asNew;

	const input = await buildConsolidatorInput(opts, similar, neighbours, now);
	const answers = await consolidateFacts(opts, config.consolidate, input, usageReports);
	if (!answers) return asNew;

	const writes = facts.map((fact) =>
		resolveFactWrite(fact, neighbours.get(fact.candidate.id) ?? [], answers.get(fact.candidate.id)),
	);
	await embedMergedContents(opts, config, writes, usageReports);
	return writes;
}

/** The closest active entries of the write scope for each fact, without its exact copy. */
async function findFactNeighbours(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	facts: CapturedFact[],
): Promise<Map<string, RetrievedEpisodicMemoryEntry[]>> {
	const embedded = facts.flatMap((fact) =>
		fact.embedding ? [{ fact, embedding: fact.embedding }] : [],
	);
	if (embedded.length === 0) return new Map();
	// One extra result replaces the exact copy, which saveEntryWithSources already merges.
	const results = await opts.memory.episodic.findSimilarEntries(
		opts.scope,
		embedded.map(({ embedding }) => embedding),
		{ topK: CONSOLIDATION_TOP_K + 1, minSimilarity: CONSOLIDATION_MIN_SIMILARITY },
	);
	return new Map(
		embedded.map(({ fact }, index) => [
			fact.candidate.id,
			(results[index] ?? [])
				.filter((entry) => entry.contentHash !== fact.contentHash)
				.slice(0, CONSOLIDATION_TOP_K),
		]),
	);
}

async function buildConsolidatorInput(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	facts: CapturedFact[],
	neighbours: Map<string, RetrievedEpisodicMemoryEntry[]>,
	now: Date,
): Promise<EpisodicMemoryConsolidatorInput> {
	const neighboursOf = (fact: CapturedFact) => neighbours.get(fact.candidate.id) ?? [];
	const neighbourIds = uniqueStrings(
		facts.flatMap((fact) => neighboursOf(fact).map(({ id }) => id)),
	);
	const evidenceByEntryId = newestEvidenceByEntryId(
		await opts.memory.episodic.getEntrySources(neighbourIds),
	);
	return {
		scope: opts.scope,
		now,
		facts: facts.map((fact) => ({
			candidateId: fact.candidate.id,
			content: fact.candidate.content,
			evidenceText: fact.candidate.evidenceText,
			createdAt: fact.candidate.createdAt,
			neighbours: neighboursOf(fact).map((entry) => ({
				id: entry.id,
				content: entry.content,
				createdAt: entry.createdAt,
				lastSeenAt: entry.lastSeenAt,
				evidenceText: evidenceByEntryId.get(entry.id),
			})),
		})),
		executionCounter: opts.executionCounter,
		modelFetch: opts.modelFetch,
	};
}

function newestEvidenceByEntryId(sources: EpisodicMemoryEntrySource[]): Map<string, string> {
	const newest = new Map<string, EpisodicMemoryEntrySource>();
	for (const source of sources) {
		const seen = newest.get(source.memoryEntryId);
		if (!seen || source.createdAt >= seen.createdAt) newest.set(source.memoryEntryId, source);
	}
	return new Map([...newest].map(([entryId, source]) => [entryId, source.evidenceText]));
}

/**
 * Asks the model in one call how each fact relates to its neighbours. Returns
 * undefined when the call fails, so the batch saves every fact as new instead
 * of retrying forever.
 */
async function consolidateFacts(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	consolidate: EpisodicMemoryConsolidateFn,
	input: EpisodicMemoryConsolidatorInput,
	usageReports: EpisodicMemoryUsageReport[],
): Promise<Map<string, ConsolidatedFact> | undefined> {
	let result: EpisodicMemoryConsolidateResult;
	try {
		result = await consolidate(input);
	} catch {
		return undefined;
	}
	if (result.usage !== undefined) {
		recordUsage(opts, usageReports, { task: 'episodic', model: result.model, usage: result.usage });
	}
	return new Map(result.consolidation.facts.map((fact) => [fact.candidateId, fact]));
}

/**
 * Reads the model answer for one fact. Unknown ids are ignored, a missing
 * answer means `different`, and an update without merged content is not used.
 */
function resolveFactWrite(
	fact: CapturedFact,
	neighbours: RetrievedEpisodicMemoryEntry[],
	answer: ConsolidatedFact | undefined,
): FactWrite {
	const relations = new Map(
		(answer?.relations ?? []).map(({ entryId, relation }) => [entryId, relation]),
	);
	const duplicateOf = neighbours.find((entry) => relations.get(entry.id) === 'duplicate');
	if (duplicateOf) return { kind: 'duplicate', fact, entryId: duplicateOf.id };

	const updatedIds = neighbours
		.filter((entry) => relations.get(entry.id) === 'update')
		.map((entry) => entry.id);
	const content = normalizeEntryContent(answer?.mergedContent ?? '');
	if (updatedIds.length === 0 || !content) return { kind: 'new', fact };
	return { kind: 'update', fact, supersedes: updatedIds, content };
}

/** Embeds all merged contents in one call. */
async function embedMergedContents(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	writes: FactWrite[],
	usageReports: EpisodicMemoryUsageReport[],
): Promise<void> {
	const updates = writes.filter((write) => write.kind === 'update');
	if (updates.length === 0) return;
	const embedded = await embedTexts(
		config,
		updates.map((update) => update.content),
		opts.executionCounter,
	);
	recordUsage(opts, usageReports, embedded.report);
	for (const [index, update] of updates.entries()) update.embedding = embedded.embeddings[index];
}

/**
 * Writes one fact. When a duplicate or an update cannot change its stored
 * entry, for example because an earlier fact of the batch replaced it, the fact
 * becomes a new entry. That save returns null when a user deleted the candidate.
 */
async function writeFact(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	write: FactWrite,
	now: Date,
): Promise<EpisodicMemoryEntry | null> {
	const source = toEntrySource(write.fact.candidate, now);
	if (write.kind === 'duplicate') {
		const refreshed = await opts.memory.episodic.addEntrySources(write.entryId, [source], now);
		if (refreshed) return refreshed;
	}
	if (write.kind === 'update') {
		const merged = await opts.memory.episodic.applyReflection(opts.scope, {
			drop: [],
			merge: [
				{
					supersedes: write.supersedes,
					entry: toNewEntry(opts.scope, config, write.content, write.embedding, now),
					sources: [source],
				},
			],
		});
		if (merged.inserted[0]) return merged.inserted[0];
	}
	const { candidate, embedding } = write.fact;
	return await opts.memory.episodic.saveEntryWithSources(
		toNewEntry(opts.scope, config, candidate.content, embedding, now),
		[source],
	);
}

function toNewEntry(
	scope: EpisodicMemoryScope,
	config: NormalizedEpisodicMemoryConfig,
	content: string,
	embedding: number[] | undefined,
	now: Date,
): NewEpisodicMemoryEntry {
	return {
		...scope,
		content,
		contentHash: hashEpisodicMemoryContent(content),
		embedding,
		embeddingModel: config.embeddingModel,
		createdAt: now,
		lastSeenAt: now,
	};
}

function toEntrySource(
	candidate: EpisodicMemoryCaptureCandidate,
	now: Date,
): NewEpisodicMemoryEntrySourceForEntry {
	return {
		candidateId: candidate.id,
		threadId: candidate.threadId,
		evidenceText: candidate.evidenceText,
		createdAt: now,
	};
}

/**
 * Keeps the report for the result and forwards it at once, so a billed call is
 * priced even when a later write throws. The callback is best-effort: a throw
 * or rejection never fails candidate processing.
 */
function recordUsage(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	usageReports: EpisodicMemoryUsageReport[],
	report: EpisodicMemoryUsageReport | undefined,
): void {
	if (!report) return;
	usageReports.push(report);
	reportSideCallUsage(opts.onUsage, report.model, report.usage);
}

function normalizeEntryContent(content: string): string {
	return redactText(content.replace(/\s+/g, ' ').trim()).text;
}
