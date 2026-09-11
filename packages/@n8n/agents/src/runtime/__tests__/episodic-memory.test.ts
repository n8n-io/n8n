import { embed, embedMany } from 'ai';

import type {
	BuiltTelemetry,
	EpisodicMemoryCaptureKind,
	EpisodicMemoryEntry,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySourceForEntry,
} from '../../types';
import {
	createRecallMemoryTool,
	getEpisodicMemoryScope,
	rankEpisodicMemoryEntries,
} from '../memory/episodic-memory';
import {
	createFlagMemoryTool,
	runEpisodicMemoryCandidateProcessor,
} from '../memory/episodic-memory-capture';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';

vi.mock('ai', () => ({
	embed: vi.fn(),
	embedMany: vi.fn(),
}));

const mockedEmbed = vi.mocked(embed);
const mockedEmbedMany = vi.mocked(embedMany);
const fakeEmbedder = { specificationVersion: 'v2' } as never;

function entry(overrides: Partial<EpisodicMemoryEntry> = {}): EpisodicMemoryEntry {
	const now = new Date('2026-05-12T10:00:00.000Z');
	return {
		id: overrides.id ?? crypto.randomUUID(),
		resourceId: overrides.resourceId ?? 'user-1',
		content: overrides.content ?? 'User chose Postgres for the memory store.',
		contentHash: overrides.contentHash ?? crypto.randomUUID(),
		status: overrides.status ?? 'active',
		supersededBy: overrides.supersededBy ?? null,
		embedding: overrides.embedding,
		embeddingModel: overrides.embeddingModel,
		metadata: overrides.metadata ?? null,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		lastSeenAt: overrides.lastSeenAt ?? now,
	};
}

async function saveEpisodicEntry(
	memory: InMemoryMemory,
	newEntry: NewEpisodicMemoryEntry,
	sources: NewEpisodicMemoryEntrySourceForEntry[] = [
		{
			observationId: crypto.randomUUID(),
			threadId: 'seed-thread',
			evidenceText: newEntry.content,
		},
	],
): Promise<EpisodicMemoryEntry> {
	const saved = await memory.episodic.saveEntryWithSources(newEntry, sources);
	if (!saved) throw new Error('Expected episodic entry to be saved');
	return saved;
}

function sourceList(text = 'Please remember that I prefer concise reports.'): AgentMessageList {
	const list = new AgentMessageList();
	list.addHistory([
		{
			id: 'message-older',
			createdAt: new Date('2026-05-12T09:00:00.000Z'),
			role: 'user',
			content: [{ type: 'text', text }],
		},
	]);
	list.addInput([
		{
			id: 'message-1',
			createdAt: new Date('2026-05-12T10:00:00.000Z'),
			role: 'user',
			content: [{ type: 'text', text }],
		},
	]);
	return list;
}

async function enqueueCandidate(
	memory: InMemoryMemory,
	toolCallId = 'call-1',
	runId = 'run-1',
	overrides: Partial<{ content: string; kind: EpisodicMemoryCaptureKind }> = {},
): Promise<void> {
	const tool = createFlagMemoryTool({
		memory,
		scope: { resourceId: 'user-1' },
		persistence: { resourceId: 'user-1', threadId: 'thread-1' },
		list: sourceList(),
	});
	if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
	await tool.handler(
		{
			content: 'User prefers concise reports.',
			evidence: 'I prefer concise reports',
			kind: 'preference',
			...overrides,
		},
		{ runId, toolCallId },
	);
}

describe('rankEpisodicMemoryEntries', () => {
	it('combines lexical, vector, and recency while ignoring inactive entries by default', () => {
		const newer = entry({
			id: 'newer',
			content: 'Acme webhook retries were caused by 429 responses.',
			embedding: [1, 0],
			createdAt: new Date(),
		});
		const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
		const older = entry({
			id: 'older',
			content: 'Acme webhook delay investigation ruled out queue lag.',
			embedding: [0.9, 0.1],
			createdAt: oldDate,
			lastSeenAt: oldDate,
		});
		const superseded = entry({
			id: 'superseded',
			content: 'Acme webhook memory store was SQLite.',
			status: 'superseded',
		});

		const results = rankEpisodicMemoryEntries([older, superseded, newer], 'Acme webhook 429', {
			queryEmbedding: [1, 0],
			topK: 5,
		});

		expect(results.map((result) => result.id)).toEqual(['newer', 'older']);
		expect(results[0].vectorScore).toBeGreaterThan(results[1].vectorScore);
		expect(results[0].finalScore).toBeGreaterThan(results[1].finalScore);
	});

	it('uses recency as a ranking signal when relevant entries are otherwise tied', () => {
		const now = new Date();
		const stalePlanning = entry({
			id: 'stale-planning',
			content: 'Midwest Southeast rollout current state manager mapping invoice review summary.',
			embedding: [1, 0],
			createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
			lastSeenAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		});
		const currentState = entry({
			id: 'current-state',
			content: 'Midwest Southeast rollout current state manager mapping invoice review summary.',
			embedding: [1, 0],
			createdAt: now,
			lastSeenAt: now,
		});

		const results = rankEpisodicMemoryEntries(
			[stalePlanning, currentState],
			'Midwest Southeast rollout current state manager mapping invoice review',
			{ queryEmbedding: [1, 0], topK: 2 },
		);

		expect(results.map((result) => result.id)).toEqual(['current-state', 'stale-planning']);
	});

	it('returns no entries when the query has no lexical or vector match', () => {
		const now = new Date();
		const newest = entry({
			id: 'newest-unrelated',
			content: 'User chose Postgres for durable memory storage.',
			createdAt: now,
			lastSeenAt: now,
		});
		const older = entry({
			id: 'older-unrelated',
			content: 'User prefers concise answers in implementation reviews.',
			createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
			lastSeenAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
		});

		const results = rankEpisodicMemoryEntries(
			[older, newest],
			'prior travel itinerary hotel booking',
			{ topK: 5 },
		);

		expect(results).toEqual([]);
	});
});

describe('createRecallMemoryTool', () => {
	it('strips retrieval metadata from the model-visible recall output', () => {
		const memory = new InMemoryMemory();
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
		});

		expect(
			tool.toModelOutput?.({
				entries: [
					{
						id: 'memory-1',
						content: 'User chose Postgres for durable memory storage.',
						createdAt: '2026-05-20T13:42:36.631Z',
						lexicalScore: 0.3,
						vectorScore: 0.6,
						rrfScore: 0.04,
						finalScore: 0.04,
					},
				],
			}),
		).toEqual({
			entries: [
				{
					content: 'Prior/historical entry: User chose Postgres for durable memory storage.',
					createdAt: '2026-05-20T13:42:36.631Z',
				},
			],
		});
	});

	it('counts recall query embedding tokens when usage is available', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 7 } } as never);
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const memory = new InMemoryMemory();
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
			executionCounter: counter,
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		await tool.handler({ query: 'what did we decide?' }, {});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(7);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});

	it('names the embedding provider when the recall embedding request fails', async () => {
		const tool = createRecallMemoryTool({
			memory: new InMemoryMemory(),
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		mockedEmbed.mockRejectedValueOnce(Object.assign(new Error('Not Found'), { statusCode: 404 }));
		await expect(tool.handler({ query: 'what did we decide?' }, {})).rejects.toThrow(
			'Episodic memory embedding request failed (HTTP 404): Not Found. Check the episodic memory embedding credential and model.',
		);

		const abortError = Object.assign(new Error('This operation was aborted'), {
			name: 'AbortError',
		});
		mockedEmbed.mockRejectedValueOnce(abortError);
		await expect(tool.handler({ query: 'what did we decide?' }, {})).rejects.toBe(abortError);
	});

	it('does not call describe() on the memory backend when ctx.parentTelemetry is absent', async () => {
		// Regression guard: a third-party BuiltMemory implementation is not
		// required to implement describe() (it's only otherwise used for schema
		// persistence) — memory access must stay telemetry-free by default.
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
		const memory = new InMemoryMemory();
		const describeSpy = vi.spyOn(memory, 'describe').mockImplementation(() => {
			throw new Error('Method not implemented.');
		});
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		await expect(tool.handler({ query: 'what did we decide?' }, {})).resolves.toEqual({
			entries: [],
		});
		expect(describeSpy).not.toHaveBeenCalled();
	});

	it('opens a query_memory span with resolved entry ids when ctx.parentTelemetry is provided', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
		const memory = new InMemoryMemory();
		const saved = await saveEpisodicEntry(memory, {
			resourceId: 'user-1',
			content: 'User chose Postgres for the memory store.',
			embedding: [1, 0],
		});
		const span = {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
			setAttributes: vi.fn(),
		};
		const tracer = {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				const spanFn = fn as (spanValue: typeof span) => Promise<unknown>;
				return await spanFn(span);
			}),
		};
		const parentTelemetry: BuiltTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		};
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
			agentName: 'my-agent',
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		await tool.handler({ query: 'what did we decide?' }, { parentTelemetry });

		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('query_memory');
		expect((options as { attributes: Record<string, unknown> }).attributes).toMatchObject({
			'gen_ai.operation.name': 'query_memory',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.memory.types': ['agent'],
			'gen_ai.memory.owners': ['user-1'],
			'gen_ai.memory.store.types': ['in_memory'],
		});
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				'gen_ai.memory.ids': [saved.id],
				'gen_ai.memory.operations': ['query_memory'],
			}),
		);
	});
});

describe('getEpisodicMemoryScope', () => {
	it('uses the persistence resourceId as the episodic memory scope', () => {
		expect(
			getEpisodicMemoryScope({
				resourceId: 'chat-user-1',
				threadId: 'thread-1',
			}),
		).toEqual({
			resourceId: 'chat-user-1',
		});
	});
});

describe('InMemoryMemory episodic source cleanup', () => {
	it('drops active entries that lose their last source when deleting a thread', async () => {
		const memory = new InMemoryMemory();
		const orphaned = await saveEpisodicEntry(
			memory,
			{ resourceId: 'user-1', content: 'User chose Postgres for durable memory storage.' },
			[
				{
					observationId: 'obs-orphaned',
					threadId: 'thread-1',
					evidenceText: 'User chose Postgres',
				},
			],
		);
		const candidate = await memory.episodic.enqueueCaptureCandidate({
			resourceId: 'user-1',
			threadId: 'thread-1',
			sourceMessageId: null,
			runId: 'run-orphaned',
			toolCallId: 'candidate-orphaned',
			content: 'User prefers concise reports.',
			evidenceText: 'I prefer concise reports',
			kind: 'preference',
		});
		const candidateBacked = await saveEpisodicEntry(
			memory,
			{ resourceId: 'user-1', content: 'User prefers concise reports.' },
			[
				{
					candidateId: candidate.id,
					threadId: 'thread-1',
					evidenceText: 'I prefer concise reports',
				},
			],
		);
		const shared = await saveEpisodicEntry(
			memory,
			{ resourceId: 'user-1', content: 'User prefers source-backed cross-session recall.' },
			[
				{
					observationId: 'obs-shared-1',
					threadId: 'thread-1',
					evidenceText: 'source-backed',
				},
				{
					observationId: 'obs-shared-2',
					threadId: 'thread-2',
					evidenceText: 'cross-session recall',
				},
			],
		);

		await memory.deleteThread('thread-1');

		await expect(
			memory.episodic.searchEntries({ resourceId: 'user-1' }, 'source-backed', { topK: 10 }),
		).resolves.toEqual([expect.objectContaining({ id: shared.id })]);
		await expect(
			memory.episodic.searchEntries({ resourceId: 'user-1' }, 'Postgres storage', {
				includeStatuses: ['dropped'],
				topK: 10,
			}),
		).resolves.toEqual([expect.objectContaining({ id: orphaned.id, status: 'dropped' })]);
		await expect(
			memory.episodic.searchEntries({ resourceId: 'user-1' }, 'concise reports', {
				includeStatuses: ['dropped'],
				topK: 10,
			}),
		).resolves.toEqual([expect.objectContaining({ id: candidateBacked.id, status: 'dropped' })]);
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([]);
	});
});

describe('agent-directed episodic capture', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedEmbedMany.mockResolvedValue({
			embeddings: [[1, 0]],
			usage: { tokens: 3 },
		} as never);
	});

	it('persists source evidence and deduplicates replayed tool calls within each run', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		await enqueueCandidate(memory);
		await enqueueCandidate(memory, 'call-1', 'run-2');

		const candidates = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
		});
		expect(candidates).toHaveLength(2);
		expect(candidates).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					sourceMessageId: 'message-1',
					runId: 'run-1',
					toolCallId: 'call-1',
					evidenceText: 'I prefer concise reports',
					status: 'pending',
				}),
				expect.objectContaining({
					sourceMessageId: 'message-1',
					runId: 'run-2',
					toolCallId: 'call-1',
				}),
			]),
		);
		await expect(memory.getMessages('thread-1', { resourceId: 'user-1' })).resolves.toEqual([
			expect.objectContaining({ id: 'message-1' }),
		]);

		const list = sourceList();
		list.addResponse([
			{
				id: 'current-response',
				createdAt: new Date('2026-05-12T10:01:00.000Z'),
				role: 'assistant',
				content: [{ type: 'text', text: 'I prefer detailed reports' }],
			},
		]);
		const tool = createFlagMemoryTool({
			memory,
			scope: { resourceId: 'user-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list,
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
		await expect(
			tool.handler(
				{
					content: 'User prefers detailed reports.',
					evidence: 'I prefer detailed reports',
					kind: 'preference',
				},
				{ runId: 'run-1', toolCallId: 'call-2' },
			),
		).rejects.toThrow('one contiguous quote');
	});

	it('resolves re-typed evidence to the verbatim span and falls back for explicit remembers', async () => {
		const memory = new InMemoryMemory();
		const tool = createFlagMemoryTool({
			memory,
			scope: { resourceId: 'user-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list: sourceList('Remember this:\nDana’s invoices must CC ap@harborfinch.example.'),
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
		const flag = async (evidence: string, kind: 'fact' | 'explicit_remember', toolCallId: string) =>
			await tool.handler!(
				{ content: 'Harbor & Finch invoices must CC ap@harborfinch.example.', evidence, kind },
				{ runId: 'run-1', toolCallId },
			);

		await flag(
			'"remember this: Dana\'s invoices must CC ap@harborfinch.example."',
			'fact',
			'call-1',
		);
		await flag('Dana said something else entirely.', 'explicit_remember', 'call-2');
		await expect(flag('Dana said something else entirely.', 'fact', 'call-3')).rejects.toThrow(
			'one contiguous quote',
		);

		const candidates = await memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' });
		expect(
			candidates.map(({ toolCallId, sourceMessageId, evidenceText }) => ({
				toolCallId,
				sourceMessageId,
				evidenceText,
			})),
		).toEqual(
			expect.arrayContaining([
				{
					toolCallId: 'call-1',
					sourceMessageId: 'message-1',
					evidenceText: 'Remember this:\nDana’s invoices must CC ap@harborfinch.example.',
				},
				{
					toolCallId: 'call-2',
					sourceMessageId: 'message-1',
					evidenceText: 'Remember this:\nDana’s invoices must CC ap@harborfinch.example.',
				},
			]),
		);
		expect(candidates).toHaveLength(2);
	});

	it('turns pending candidates into source-backed entries without observations', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		const reflect = vi.fn();

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: { embedder: fakeEmbedder, reflect },
				scope: { resourceId: 'user-1' },
				now: new Date('2026-05-12T11:00:00.000Z'),
			}),
		).resolves.toEqual({ status: 'ran', entriesWritten: 1, candidatesProcessed: 1 });

		// Reflection only runs for corrections; a plain preference must not pay for it.
		expect(reflect).not.toHaveBeenCalled();
		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'user-1' },
			'concise reports',
		);
		expect(entries).toEqual([
			expect.objectContaining({ content: 'User prefers concise reports.', status: 'active' }),
		]);
		await expect(memory.episodic.getEntrySources([entries[0].id])).resolves.toEqual([
			expect.objectContaining({
				candidateId: expect.any(String),
				threadId: 'thread-1',
				evidenceText: 'I prefer concise reports',
			}),
		]);
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([]);
	});

	it('redacts candidate content and evidence before persistence', async () => {
		const memory = new InMemoryMemory();
		const secret = 'sk-ant-api03-aaaaaaaaaaaaaaaa';
		const tool = createFlagMemoryTool({
			memory,
			scope: { resourceId: 'user-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list: sourceList(`Remember key ${secret}.`),
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');

		await tool.handler(
			{
				content: `The key is ${secret}.`,
				evidence: `key ${secret}`,
				kind: 'explicit_remember',
			},
			{ runId: 'run-1', toolCallId: 'secret-call' },
		);

		const [candidate] = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
		});
		expect(candidate.content).not.toContain(secret);
		expect(candidate.evidenceText).not.toContain(secret);
		expect(candidate.content).toContain('[REDACTED]');
	});

	it('retries partial persistence without duplicating entries or sources', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		await enqueueCandidate(memory, 'call-2', 'run-1', {
			content: 'The preferred reports use concise summaries.',
		});
		mockedEmbedMany.mockResolvedValue({
			embeddings: [
				[1, 0],
				[0, 1],
			],
			usage: { tokens: 6 },
		} as never);
		const save = memory.episodic.saveEntryWithSources.bind(memory.episodic);
		const saveSpy = vi
			.spyOn(memory.episodic, 'saveEntryWithSources')
			.mockImplementationOnce(save)
			.mockRejectedValueOnce(new Error('temporary persistence failure'));

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: { embedder: fakeEmbedder },
				scope: { resourceId: 'user-1' },
			}),
		).rejects.toThrow('temporary persistence failure');
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([
			expect.objectContaining({ attemptCount: 1, status: 'pending' }),
			expect.objectContaining({ attemptCount: 1, status: 'pending' }),
		]);

		saveSpy.mockImplementation(save);
		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
		});

		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'user-1' },
			'concise reports summaries',
			{ topK: 10 },
		);
		expect(entries).toHaveLength(2);
		await expect(
			memory.episodic.getEntrySources(entries.map((entry) => entry.id)),
		).resolves.toHaveLength(2);
	});

	it('reflects candidate entries with legacy observation-backed entries', async () => {
		const memory = new InMemoryMemory();
		const legacy = await saveEpisodicEntry(
			memory,
			{
				resourceId: 'user-1',
				content: 'User planned SQLite for local-first memory storage.',
				embedding: [1, 0],
			},
			[
				{
					observationId: 'obs-old',
					threadId: 'thread-old',
					evidenceText: 'User planned SQLite',
				},
			],
		);
		await memory.episodic.enqueueCaptureCandidate({
			resourceId: 'user-1',
			threadId: 'thread-1',
			sourceMessageId: null,
			runId: 'run-correction',
			toolCallId: 'call-correction',
			content: 'User switched memory storage from SQLite to Postgres.',
			evidenceText: 'I switched from SQLite to Postgres',
			kind: 'correction',
		});

		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: {
				embedder: fakeEmbedder,
				reflect: async ({ seedEntryIds }) =>
					await Promise.resolve({
						drop: [],
						merge: [
							{
								supersedes: [legacy.id, seedEntryIds[0]],
								content: 'User replaced the SQLite plan with Postgres.',
							},
						],
					}),
			},
			scope: { resourceId: 'user-1' },
		});

		const active = await memory.episodic.searchEntries(
			{ resourceId: 'user-1' },
			'SQLite Postgres',
			{ queryEmbedding: [1, 0], topK: 10 },
		);
		expect(active).toHaveLength(1);
		const sources = await memory.episodic.getEntrySources([active[0].id]);
		expect(sources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ observationId: 'obs-old' }),
				expect.objectContaining({ candidateId: expect.any(String) }),
			]),
		);
	});

	it('does not retry persisted candidates when reflection fails', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory, 'call-1', 'run-1', { kind: 'correction' });
		const reflectionError = new Error('reflection failed');

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: {
					embedder: fakeEmbedder,
					reflect: async () => await Promise.reject(reflectionError),
				},
				scope: { resourceId: 'user-1' },
			}),
		).rejects.toThrow(reflectionError);

		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([]);
		await expect(
			memory.episodic.searchEntries({ resourceId: 'user-1' }, 'concise reports'),
		).resolves.toHaveLength(1);
	});
});
