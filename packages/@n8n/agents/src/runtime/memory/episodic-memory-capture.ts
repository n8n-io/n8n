import { z } from 'zod';

import {
	getEpisodicMemoryScope,
	hashEpisodicMemoryContent,
	hasEpisodicMemoryCaptureStore,
	isEpisodicMemoryEnabled,
	withEpisodicMemoryDefaults,
	type NormalizedEpisodicMemoryConfig,
} from './episodic-memory';
import { DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION } from './episodic-memory-defaults';
import { normalizeFlatReflectionActions } from './memory-lifecycle';
import { saveMessagesToThread } from './memory-store';
import { throwIfAborted } from '../../sdk/abort';
import { redactText } from '../../sdk/guardrails';
import { Tool } from '../../sdk/tool';
import type {
	BuiltEpisodicMemoryCaptureStore,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryCaptureCandidate,
	EpisodicMemoryConfig,
	EpisodicMemoryEntry,
	EpisodicMemoryExtractionCandidate,
	EpisodicMemoryReflection,
	EpisodicMemoryReflectionMerge,
	EpisodicMemoryScope,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import type { AgentExecutionCounter, AgentPersistenceOptions } from '../../types/sdk/agent';
import type { AgentDbMessage } from '../../types/sdk/message';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import type { AgentMessageList } from '../model/message-list';
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';

export const FLAG_MEMORY_TOOL_NAME = 'flag_memory';
const EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS = 3;

const captureKinds = ['explicit_remember', 'preference', 'decision', 'fact', 'correction'] as const;

const FlagMemoryInputSchema = z.object({
	content: z.string().min(1),
	evidence: z.string().min(1),
	kind: z.enum(captureKinds),
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
		!episodicMemory.extract ||
		!hasEpisodicMemoryCaptureStore(memory)
	) {
		return undefined;
	}
	const scope = getEpisodicMemoryScope(persistence);
	return scope ? { memory, config: episodicMemory, scope } : undefined;
}

export function createFlagMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryCaptureStore;
	scope: EpisodicMemoryScope;
	persistence: AgentPersistenceOptions;
	list: AgentMessageList;
}) {
	return new Tool(FLAG_MEMORY_TOOL_NAME)
		.description(
			'Flag source-backed information from this conversation for durable episodic-memory processing.',
		)
		.systemInstruction(DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION)
		.input(FlagMemoryInputSchema)
		.output(FlagMemoryOutputSchema)
		.handler(async ({ content, evidence, kind }, ctx): Promise<FlagMemoryOutput> => {
			if (!ctx.toolCallId) throw new Error('Memory capture requires a tool-call ID.');
			if (!ctx.runId) throw new Error('Memory capture requires a run ID.');
			const source = findEvidenceSource(opts.list, evidence);
			if (!source) {
				throw new Error('Memory evidence must exactly match text from this conversation.');
			}
			const normalizedContent = normalizeEntryContent(content);
			if (!normalizedContent) throw new Error('Memory content cannot be empty.');

			await saveMessagesToThread(
				opts.memory,
				opts.persistence.threadId,
				opts.persistence.resourceId,
				[source],
			);
			await opts.memory.episodic.enqueueCaptureCandidate({
				...opts.scope,
				threadId: opts.persistence.threadId,
				sourceMessageId: source.id,
				runId: ctx.runId,
				toolCallId: ctx.toolCallId,
				content: normalizedContent,
				evidenceText: redactText(evidence.trim()).text,
				kind,
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
	agentName?: string;
	abortSignal?: AbortSignal;
}

export type RunEpisodicMemoryCandidateProcessorResult =
	| { status: 'skipped' }
	| { status: 'ran'; entriesWritten: number; candidatesProcessed: number };

/**
 * Abort checks sit at entry, after each await that does not receive the signal,
 * and before each write. Awaits that receive the signal are checked once more
 * because a custom extractor, reflector, or embedder may ignore it.
 */
export async function runEpisodicMemoryCandidateProcessor(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
): Promise<RunEpisodicMemoryCandidateProcessorResult> {
	throwIfAborted(opts.abortSignal);
	if (!isEpisodicMemoryEnabled(opts.config)) return { status: 'skipped' };

	const config = withEpisodicMemoryDefaults(opts.config);
	if (!config.extract) return { status: 'skipped' };

	const captureCandidates = await opts.memory.episodic.getPendingCaptureCandidates(opts.scope, {
		limit: config.maxEntriesPerRun,
	});
	throwIfAborted(opts.abortSignal);
	if (captureCandidates.length === 0) return { status: 'skipped' };

	const now = opts.now ?? new Date();
	const candidateIds = captureCandidates.map((candidate) => candidate.id);
	const capturesById = new Map(captureCandidates.map((candidate) => [candidate.id, candidate]));
	let savedEntries: EpisodicMemoryEntry[] = [];
	try {
		const existingEntries = await opts.memory.episodic.searchEntries(
			opts.scope,
			captureCandidates
				.flatMap((candidate) => [candidate.content, candidate.evidenceText])
				.join('\n'),
			{ topK: Math.max(config.topK, 20) },
		);
		throwIfAborted(opts.abortSignal);
		const extraction = await config.extract({
			scope: opts.scope,
			now,
			candidates: captureCandidates,
			renderedCandidates: renderCaptureCandidates(captureCandidates),
			existingEntries,
			executionCounter: opts.executionCounter,
			abortSignal: opts.abortSignal,
		});
		throwIfAborted(opts.abortSignal);
		const candidates = validateExtractionCandidates(extraction.entries, capturesById).slice(
			0,
			config.maxEntriesPerRun,
		);
		savedEntries = await saveExtractionCandidates(opts, config, candidates, now);
		throwIfAborted(opts.abortSignal);
		await opts.memory.episodic.completeCaptureCandidates(candidateIds);
	} catch (error) {
		if (opts.abortSignal?.aborted) throw error;
		await opts.memory.episodic.recordCaptureCandidateFailure(
			candidateIds,
			EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS,
		);
		throw error;
	}

	if (savedEntries.length > 0 && config.reflect) {
		await runEpisodicMemoryReflection(opts, config, savedEntries, captureCandidates, now);
	}
	return {
		status: 'ran',
		entriesWritten: savedEntries.length,
		candidatesProcessed: captureCandidates.length,
	};
}

function findEvidenceSource(list: AgentMessageList, evidence: string): AgentDbMessage | undefined {
	const normalizedEvidence = evidence.trim();
	if (!normalizedEvidence) return undefined;
	const responseIds = new Set(list.responseDelta().map((message) => message.id));
	return [...list.messages()].reverse().find((message) => {
		if (responseIds.has(message.id) || !('role' in message)) return false;
		if (message.role !== 'user' && message.role !== 'assistant') return false;
		if (message.origin?.kind === 'tool') return false;
		return message.content.some(
			(part) => part.type === 'text' && part.text.includes(normalizedEvidence),
		);
	});
}

function renderCaptureCandidates(candidates: EpisodicMemoryCaptureCandidate[]): string {
	return candidates
		.map(
			(candidate) =>
				`[${candidate.id}] ${candidate.kind.toUpperCase()} ${candidate.createdAt.toISOString()}\nCandidate: ${candidate.content}\nEvidence: ${candidate.evidenceText}`,
		)
		.join('\n\n');
}

interface ValidatedExtractionCandidate {
	content: string;
	sources: Array<{ candidateId: string; threadId: string; evidence: string }>;
}

function validateExtractionCandidates(
	candidates: EpisodicMemoryExtractionCandidate[],
	capturesById: Map<string, EpisodicMemoryCaptureCandidate>,
): ValidatedExtractionCandidate[] {
	const valid: ValidatedExtractionCandidate[] = [];
	for (const candidate of candidates) {
		const sourceKeys = new Set<string>();
		const sources = candidate.sources.flatMap((source) => {
			const evidence = source.evidence.trim();
			const capture = capturesById.get(source.candidateId);
			if (!capture || !evidence || !capture.evidenceText.includes(evidence)) return [];
			const key = `${source.candidateId}\n${evidence}`;
			if (sourceKeys.has(key)) return [];
			sourceKeys.add(key);
			return [{ candidateId: source.candidateId, threadId: capture.threadId, evidence }];
		});
		const content = normalizeEntryContent(candidate.content);
		if (content && sources.length > 0) valid.push({ content, sources });
	}
	return valid;
}

async function embedTexts(
	config: NormalizedEpisodicMemoryConfig,
	values: string[],
	opts: Pick<RunEpisodicMemoryCandidateProcessorOpts, 'abortSignal' | 'executionCounter'>,
): Promise<number[][]> {
	const { embedMany } = await import('ai');
	const { embeddings, usage } = await embedMany({
		model: config.embedder,
		values,
		abortSignal: opts.abortSignal,
	});
	throwIfAborted(opts.abortSignal);
	incrementTokenCountFromUsage(opts.executionCounter, usage);
	return embeddings;
}

async function saveExtractionCandidates(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: ValidatedExtractionCandidate[],
	now: Date,
): Promise<EpisodicMemoryEntry[]> {
	if (candidates.length === 0) return [];
	const savedEntries: EpisodicMemoryEntry[] = [];
	await withMemorySpan(
		'save_memory',
		opts.agentName ?? 'agent',
		opts.telemetry,
		() => ({
			types: ['agent'],
			owners: [opts.scope.resourceId],
			...inferMemoryStoreAttributes(opts.memory),
		}),
		async () => {
			const embeddings = await embedTexts(
				config,
				candidates.map((candidate) => candidate.content),
				opts,
			);
			for (const [index, candidate] of candidates.entries()) {
				throwIfAborted(opts.abortSignal);
				const saved = await opts.memory.episodic.saveEntryWithSources(
					{
						...opts.scope,
						content: candidate.content,
						contentHash: hashEpisodicMemoryContent(candidate.content),
						embedding: embeddings[index],
						embeddingModel: config.embeddingModel,
						createdAt: now,
						lastSeenAt: now,
					},
					candidate.sources.map((source) => ({
						candidateId: source.candidateId,
						threadId: source.threadId,
						evidenceText: redactText(source.evidence).text,
						createdAt: now,
					})),
				);
				if (saved) savedEntries.push(saved);
			}
			return {
				result: undefined,
				attributes: {
					ids: savedEntries.map((entry) => entry.id),
					operations: savedEntries.map(() => 'created' as const),
				},
			};
		},
	);
	return savedEntries;
}

async function runEpisodicMemoryReflection(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	savedEntries: EpisodicMemoryEntry[],
	candidates: EpisodicMemoryCaptureCandidate[],
	now: Date,
): Promise<void> {
	if (!config.reflect) return;
	throwIfAborted(opts.abortSignal);
	const cluster = await buildReflectionCluster(opts, config, savedEntries, candidates);
	throwIfAborted(opts.abortSignal);
	if (cluster.length === 0) return;

	const sources = await opts.memory.episodic.getEntrySources(cluster.map((entry) => entry.id));
	throwIfAborted(opts.abortSignal);
	const reflection = normalizeEpisodicMemoryReflection(
		cluster,
		await config.reflect({
			scope: opts.scope,
			now,
			seedEntryIds: savedEntries.map((entry) => entry.id),
			entries: cluster,
			sources,
			executionCounter: opts.executionCounter,
			abortSignal: opts.abortSignal,
		}),
	);
	throwIfAborted(opts.abortSignal);
	if (reflection.drop.length === 0 && reflection.merge.length === 0) return;

	const mergeContents = reflection.merge.map((entry) => entry.content);
	const mergeEmbeddings =
		mergeContents.length > 0 ? await embedTexts(config, mergeContents, opts) : [];
	await opts.memory.episodic.applyReflection(opts.scope, {
		drop: reflection.drop,
		merge: reflection.merge.map((merge, index) => ({
			supersedes: merge.supersedes,
			entry: {
				...opts.scope,
				content: merge.content,
				contentHash: hashEpisodicMemoryContent(merge.content),
				embedding: mergeEmbeddings[index],
				embeddingModel: config.embeddingModel,
				createdAt: now,
				lastSeenAt: now,
			},
		})),
	});
}

async function buildReflectionCluster(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	savedEntries: EpisodicMemoryEntry[],
	candidates: EpisodicMemoryCaptureCandidate[],
): Promise<RetrievedEpisodicMemoryEntry[]> {
	const query = [
		...savedEntries.map((entry) => entry.content),
		...candidates.flatMap((candidate) => [candidate.content, candidate.evidenceText]),
	].join('\n');
	const related = await opts.memory.episodic.searchEntries(opts.scope, query, {
		topK: Math.max(config.topK, 20),
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
			const content = normalizeEntryContent(entry.content);
			return content ? { supersedes, content } : null;
		},
	});
}

function normalizeEntryContent(content: string): string {
	return redactText(content.replace(/\s+/g, ' ').trim()).text;
}

function toRetrievedEntry(entry: EpisodicMemoryEntry): RetrievedEpisodicMemoryEntry {
	return {
		...entry,
		lexicalScore: 0,
		vectorScore: 0,
		rrfScore: 0,
		finalScore: 0,
	};
}
