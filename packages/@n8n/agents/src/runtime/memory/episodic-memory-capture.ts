import { z } from 'zod';

import {
	hashEpisodicMemoryContent,
	isEpisodicMemoryEnabled,
	withEpisodicMemoryDefaults,
	type NormalizedEpisodicMemoryConfig,
} from './episodic-memory';
import {
	DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
} from './episodic-memory-defaults';
import { normalizeFlatReflectionActions } from './memory-lifecycle';
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
			const source = findEvidenceSource(opts.list, evidence);
			if (!source) {
				throw new Error('Memory evidence must exactly match text from this conversation.');
			}
			const normalizedContent = normalizeEntryContent(content);
			if (!normalizedContent) throw new Error('Memory content cannot be empty.');

			await opts.memory.episodic.enqueueCaptureCandidate({
				...opts.scope,
				threadId: opts.persistence.threadId,
				sourceMessageId: source.id,
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
}

export type RunEpisodicMemoryCandidateProcessorResult =
	| { status: 'skipped'; reason: 'disabled' | 'no-extract' | 'no-candidates' }
	| { status: 'ran'; entriesWritten: number; candidatesProcessed: number };

export async function runEpisodicMemoryCandidateProcessor(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
): Promise<RunEpisodicMemoryCandidateProcessorResult> {
	if (!isEpisodicMemoryEnabled(opts.config)) return { status: 'skipped', reason: 'disabled' };

	const config = withEpisodicMemoryDefaults(opts.config);
	if (!config.extract) return { status: 'skipped', reason: 'no-extract' };

	const captureCandidates = await opts.memory.episodic.getPendingCaptureCandidates(opts.scope, {
		limit: config.maxEntriesPerRun,
	});
	if (captureCandidates.length === 0) return { status: 'skipped', reason: 'no-candidates' };

	const candidateIds = captureCandidates.map((candidate) => candidate.id);
	let savedEntries: EpisodicMemoryEntry[] = [];
	try {
		const existingEntries = await opts.memory.episodic.searchEntries(
			opts.scope,
			captureCandidates
				.flatMap((candidate) => [candidate.content, candidate.evidenceText])
				.join('\n'),
			{ topK: Math.max(config.topK, 20) },
		);
		const extraction = await config.extract({
			scope: opts.scope,
			now: opts.now ?? new Date(),
			candidates: captureCandidates,
			renderedCandidates: renderCaptureCandidates(captureCandidates),
			existingEntries,
			executionCounter: opts.executionCounter,
		});
		const candidates = validateExtractionCandidates(extraction.entries, captureCandidates).slice(
			0,
			config.maxEntriesPerRun,
		);
		savedEntries = await saveExtractionCandidates(opts, config, candidates, captureCandidates);
		await opts.memory.episodic.completeCaptureCandidates(candidateIds);
	} catch (error) {
		await opts.memory.episodic.recordCaptureCandidateFailure(
			candidateIds,
			EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS,
		);
		throw error;
	}

	if (savedEntries.length > 0 && config.reflect) {
		await runEpisodicMemoryReflection(opts, config, savedEntries, captureCandidates);
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
	sources: Array<{ candidateId: string; evidence: string }>;
}

function validateExtractionCandidates(
	candidates: EpisodicMemoryExtractionCandidate[],
	captureCandidates: EpisodicMemoryCaptureCandidate[],
): ValidatedExtractionCandidate[] {
	const capturesById = new Map(captureCandidates.map((candidate) => [candidate.id, candidate]));
	const valid: ValidatedExtractionCandidate[] = [];
	for (const candidate of candidates) {
		const sourceKeys = new Set<string>();
		const sources = candidate.sources.flatMap((source) => {
			const evidence = source.evidence.trim();
			const capture = capturesById.get(source.candidateId);
			if (!evidence || !capture?.evidenceText.includes(evidence)) return [];
			const key = `${source.candidateId}\n${evidence}`;
			if (sourceKeys.has(key)) return [];
			sourceKeys.add(key);
			return [{ candidateId: source.candidateId, evidence }];
		});
		const content = normalizeEntryContent(candidate.content);
		if (!content || sources.length === 0) continue;
		const evidenceText = sources.map((source) => source.evidence).join('\n');
		const sourceText = sources
			.map((source) => capturesById.get(source.candidateId)?.evidenceText ?? '')
			.join('\n');
		if (isFailedRecallCandidate(content, evidenceText, sourceText)) continue;
		valid.push({ content, sources });
	}
	return valid;
}

async function saveExtractionCandidates(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: ValidatedExtractionCandidate[],
	captureCandidates: EpisodicMemoryCaptureCandidate[],
): Promise<EpisodicMemoryEntry[]> {
	if (candidates.length === 0) return [];
	const capturesById = new Map(captureCandidates.map((candidate) => [candidate.id, candidate]));
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
			const { embedMany } = await import('ai');
			const { embeddings, usage } = await embedMany({
				model: config.embedder,
				values: candidates.map((candidate) => candidate.content),
			});
			incrementTokenCountFromUsage(opts.executionCounter, usage);
			for (const [index, candidate] of candidates.entries()) {
				const now = opts.now ?? new Date();
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
					candidate.sources.flatMap((source) => {
						const capture = capturesById.get(source.candidateId);
						if (!capture) return [];
						return [
							{
								candidateId: source.candidateId,
								threadId: capture.threadId,
								evidenceText: redactText(source.evidence).text,
								createdAt: now,
							},
						];
					}),
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
): Promise<void> {
	if (!config.reflect) return;
	const cluster = await buildReflectionCluster(opts, config, savedEntries, candidates);
	if (cluster.length === 0) return;

	const sources = await opts.memory.episodic.getEntrySources(cluster.map((entry) => entry.id));
	const reflection = normalizeEpisodicMemoryReflection(
		cluster,
		await config.reflect({
			scope: opts.scope,
			now: opts.now ?? new Date(),
			seedEntryIds: savedEntries.map((entry) => entry.id),
			entries: cluster,
			sources,
			executionCounter: opts.executionCounter,
		}),
	);
	if (reflection.drop.length === 0 && reflection.merge.length === 0) return;

	const mergeContents = reflection.merge.map((entry) => entry.content);
	let mergeEmbeddings: number[][] = [];
	if (mergeContents.length > 0) {
		const { embedMany } = await import('ai');
		const { embeddings, usage } = await embedMany({
			model: config.embedder,
			values: mergeContents,
		});
		mergeEmbeddings = embeddings;
		incrementTokenCountFromUsage(opts.executionCounter, usage);
	}
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
				createdAt: opts.now ?? new Date(),
				lastSeenAt: opts.now ?? new Date(),
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
		topK: Math.max(config.topK, DEFAULT_EPISODIC_MEMORY_TOP_K, 20),
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

function toRetrievedEntry(entry: EpisodicMemoryEntry): RetrievedEpisodicMemoryEntry {
	return {
		...entry,
		lexicalScore: 0,
		vectorScore: 0,
		rrfScore: 0,
		finalScore: 0,
	};
}
