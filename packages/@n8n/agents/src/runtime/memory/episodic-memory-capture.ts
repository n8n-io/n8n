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
import { normalizeFlatReflectionActions } from './memory-lifecycle';
import { saveMessagesToThread } from './memory-store';
import { redactText } from '../../sdk/guardrails';
import { Tool } from '../../sdk/tool';
import type {
	BuiltEpisodicMemoryCaptureStore,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryCaptureCandidate,
	EpisodicMemoryConfig,
	EpisodicMemoryEntry,
	EpisodicMemoryReflection,
	EpisodicMemoryReflectionMerge,
	EpisodicMemoryScope,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import type { AgentExecutionCounter, AgentPersistenceOptions } from '../../types/sdk/agent';
import type { AgentDbMessage, Message } from '../../types/sdk/message';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import type { AgentMessageList } from '../model/message-list';
import { inferMemoryStoreAttributes, withMemorySpan } from '../telemetry/runtime-telemetry';

export const FLAG_MEMORY_TOOL_NAME = 'flag_memory';
const EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS = 3;

const captureKinds = [
	'explicit_remember',
	'preference',
	'decision',
	'fact',
	'correction',
	'resolution',
	'request',
] as const;

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
	kind: z
		.enum(captureKinds)
		.describe(
			'explicit_remember: the user asked you to remember it; use it even when another kind also fits. preference: how the user wants things done. decision: a choice the user made or rejected. fact: a stable detail about the user, account, or their setup. correction: replaces something stated earlier. resolution: the root cause and the fix that closed a case. request: a change the user asked for that takes effect later.',
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

export function createFlagMemoryTool(opts: {
	memory: BuiltMemory & BuiltEpisodicMemoryCaptureStore;
	scope: EpisodicMemoryScope;
	persistence: AgentPersistenceOptions;
	list: AgentMessageList;
}) {
	return new Tool(FLAG_MEMORY_TOOL_NAME)
		.description(
			'Save one durable note about this user, account, or case. This is the only way a detail carries over to future conversations.',
		)
		.systemInstruction(DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION)
		.input(FlagMemoryInputSchema)
		.output(FlagMemoryOutputSchema)
		.handler(async ({ content, evidence, kind }, ctx): Promise<FlagMemoryOutput> => {
			if (!ctx.toolCallId) throw new Error('Memory capture requires a tool-call ID.');
			if (!ctx.runId) throw new Error('Memory capture requires a run ID.');
			const source =
				findEvidenceSource(opts.list, evidence) ??
				(kind === 'explicit_remember' ? latestUserMessageAsEvidence(opts.list) : undefined);
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
	| { status: 'skipped' }
	| { status: 'ran'; entriesWritten: number; candidatesProcessed: number };

/**
 * Flagged candidates become entries as written: the agent already phrased the
 * content, and the verbatim evidence is the source. Reflection runs only when
 * the batch corrects something, because that is when existing entries change.
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

	const now = opts.now ?? new Date();
	const candidateIds = candidates.map((candidate) => candidate.id);
	let savedEntries: EpisodicMemoryEntry[];
	try {
		savedEntries = await saveCandidateEntries(opts, config, candidates, now);
		await opts.memory.episodic.completeCaptureCandidates(candidateIds);
	} catch (error) {
		await opts.memory.episodic.recordCaptureCandidateFailure(
			candidateIds,
			EPISODIC_MEMORY_CAPTURE_MAX_ATTEMPTS,
		);
		throw error;
	}

	if (
		savedEntries.length > 0 &&
		config.reflect &&
		candidates.some((candidate) => candidate.kind === 'correction')
	) {
		await runEpisodicMemoryReflection(opts, config, savedEntries, candidates, now);
	}
	return {
		status: 'ran',
		entriesWritten: savedEntries.length,
		candidatesProcessed: candidates.length,
	};
}

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

/** An explicit "remember this" nearly always lives in the latest user message. */
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
): Promise<number[][]> {
	const { embedMany } = await import('ai');
	const { embeddings, usage } = await withEmbeddingErrorContext(
		async () => await embedMany({ model: config.embedder, values }),
	);
	incrementTokenCountFromUsage(executionCounter, usage);
	return embeddings;
}

async function saveCandidateEntries(
	opts: RunEpisodicMemoryCandidateProcessorOpts,
	config: NormalizedEpisodicMemoryConfig,
	candidates: EpisodicMemoryCaptureCandidate[],
	now: Date,
): Promise<EpisodicMemoryEntry[]> {
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
				opts.executionCounter,
			);
			for (const [index, candidate] of candidates.entries()) {
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
					[
						{
							candidateId: candidate.id,
							threadId: candidate.threadId,
							evidenceText: candidate.evidenceText,
							createdAt: now,
						},
					],
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
	const cluster = await buildReflectionCluster(opts, config, savedEntries, candidates);
	if (cluster.length === 0) return;

	const sources = await opts.memory.episodic.getEntrySources(cluster.map((entry) => entry.id));
	const reflection = normalizeEpisodicMemoryReflection(
		cluster,
		await config.reflect({
			scope: opts.scope,
			now,
			seedEntryIds: savedEntries.map((entry) => entry.id),
			entries: cluster,
			sources,
			executionCounter: opts.executionCounter,
		}),
	);
	if (reflection.drop.length === 0 && reflection.merge.length === 0) return;

	const mergeContents = reflection.merge.map((entry) => entry.content);
	const mergeEmbeddings =
		mergeContents.length > 0 ? await embedTexts(config, mergeContents, opts.executionCounter) : [];
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
		writeScopeOnly: true,
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
