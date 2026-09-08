import { embed, embedMany } from 'ai';

import type {
	BuiltTelemetry,
	EpisodicMemoryEntry,
	EpisodicMemoryExtractFn,
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

async function enqueueCandidate(memory: InMemoryMemory, toolCallId = 'call-1'): Promise<void> {
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
		},
		{ toolCallId },
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
	});

	it('uses recency when relevant entries are otherwise tied', () => {
		const now = new Date();
		const oldDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
		const content = 'Midwest rollout current state manager mapping invoice review.';
		const results = rankEpisodicMemoryEntries(
			[
				entry({ id: 'old', content, embedding: [1, 0], createdAt: oldDate, lastSeenAt: oldDate }),
				entry({ id: 'new', content, embedding: [1, 0], createdAt: now, lastSeenAt: now }),
			],
			'Midwest rollout current state manager mapping invoice review',
			{ queryEmbedding: [1, 0], topK: 2 },
		);

		expect(results.map((result) => result.id)).toEqual(['new', 'old']);
	});

	it('returns no entries without lexical or vector relevance', () => {
		expect(
			rankEpisodicMemoryEntries(
				[
					entry({ content: 'User chose Postgres for memory storage.' }),
					entry({ content: 'User prefers concise implementation reviews.' }),
				],
				'prior travel itinerary hotel booking',
			),
		).toEqual([]);
	});
});

describe('createRecallMemoryTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns source entries while hiding retrieval scores from the model output', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 7 } } as never);
		const memory = new InMemoryMemory();
		await saveEpisodicEntry(memory, {
			resourceId: 'user-1',
			content: 'User chose Postgres for the memory store.',
			embedding: [1, 0],
		});
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		const output = await tool.handler({ query: 'Postgres memory store' }, {});
		expect(output).toMatchObject({
			entries: [{ content: 'User chose Postgres for the memory store.' }],
		});
		const modelOutput = tool.toModelOutput?.(output);
		expect(modelOutput).toMatchObject({
			entries: [{ content: 'Prior/historical entry: User chose Postgres for the memory store.' }],
		});
		expect(modelOutput).not.toHaveProperty('entries.0.score');
	});

	it('counts query embedding tokens', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 7 } } as never);
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const tool = createRecallMemoryTool({
			memory: new InMemoryMemory(),
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
			executionCounter: counter,
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		await tool.handler({ query: 'what did we decide?' }, {});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(7);
	});

	it('only opens telemetry spans when telemetry is provided', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
		const memory = new InMemoryMemory();
		const describeSpy = vi.spyOn(memory, 'describe');
		const span = {
			end: vi.fn(),
			recordException: vi.fn(),
			setStatus: vi.fn(),
			setAttributes: vi.fn(),
		};
		const tracer = {
			startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
				return await (fn as (value: typeof span) => Promise<unknown>)(span);
			}),
		};
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1' },
			agentName: 'my-agent',
		});
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		await tool.handler({ query: 'what did we decide?' }, {});
		expect(describeSpy).not.toHaveBeenCalled();

		const parentTelemetry: BuiltTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			tracer,
		};
		await tool.handler({ query: 'what did we decide?' }, { parentTelemetry });
		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'query_memory',
			expect.anything(),
			expect.any(Function),
		);
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

	it('enqueues exact source evidence idempotently and rejects unsupported evidence', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		await enqueueCandidate(memory);

		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([
			expect.objectContaining({
				sourceMessageId: 'message-1',
				toolCallId: 'call-1',
				evidenceText: 'I prefer concise reports',
				status: 'pending',
			}),
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
				{ toolCallId: 'call-2' },
			),
		).rejects.toThrow('must exactly match');
	});

	it('turns pending candidates into source-backed entries without observations', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		const extract: EpisodicMemoryExtractFn = async ({ candidates }) =>
			await Promise.resolve({
				entries: [
					{
						content: 'User prefers concise reports.',
						sources: [
							{
								candidateId: candidates[0].id,
								evidence: 'I prefer concise reports',
							},
						],
					},
				],
			});

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: { embedder: fakeEmbedder, extract },
				scope: { resourceId: 'user-1' },
				now: new Date('2026-05-12T11:00:00.000Z'),
			}),
		).resolves.toEqual({ status: 'ran', entriesWritten: 1, candidatesProcessed: 1 });

		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'user-1' },
			'concise reports',
		);
		expect(entries).toHaveLength(1);
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
			{ toolCallId: 'secret-call' },
		);

		const [candidate] = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
		});
		expect(candidate.content).not.toContain(secret);
		expect(candidate.evidenceText).not.toContain(secret);
		expect(candidate.content).toContain('[REDACTED]');
	});

	it('completes a candidate when extraction finds nothing', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);

		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: {
				embedder: fakeEmbedder,
				extract: async () => await Promise.resolve({ entries: [] }),
			},
			scope: { resourceId: 'user-1' },
		});

		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([]);
		await expect(
			memory.episodic.searchEntries({ resourceId: 'user-1' }, 'concise reports'),
		).resolves.toEqual([]);
	});

	it('retries partial persistence without duplicating entries or sources', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		const extract: EpisodicMemoryExtractFn = async ({ candidates }) =>
			await Promise.resolve({
				entries: [
					{
						content: 'User prefers concise reports.',
						sources: [
							{
								candidateId: candidates[0].id,
								evidence: 'I prefer concise reports',
							},
						],
					},
					{
						content: 'The preferred reports use concise summaries.',
						sources: [
							{
								candidateId: candidates[0].id,
								evidence: 'I prefer concise reports',
							},
						],
					},
				],
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
				config: { embedder: fakeEmbedder, extract },
				scope: { resourceId: 'user-1' },
			}),
		).rejects.toThrow('temporary persistence failure');
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1' }),
		).resolves.toEqual([expect.objectContaining({ attemptCount: 1, status: 'pending' })]);

		saveSpy.mockImplementation(save);
		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: { embedder: fakeEmbedder, extract },
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
			toolCallId: 'call-correction',
			content: 'User switched memory storage from SQLite to Postgres.',
			evidenceText: 'I switched from SQLite to Postgres',
			kind: 'correction',
		});

		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: {
				embedder: fakeEmbedder,
				extract: async ({ candidates }) =>
					await Promise.resolve({
						entries: [
							{
								content: 'User switched memory storage from SQLite to Postgres.',
								sources: [
									{
										candidateId: candidates[0].id,
										evidence: 'I switched from SQLite to Postgres',
									},
								],
							},
						],
					}),
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
		await enqueueCandidate(memory);
		const reflectionError = new Error('reflection failed');

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: {
					embedder: fakeEmbedder,
					extract: async ({ candidates }) =>
						await Promise.resolve({
							entries: [
								{
									content: 'User prefers concise reports.',
									sources: [
										{
											candidateId: candidates[0].id,
											evidence: 'I prefer concise reports',
										},
									],
								},
							],
						}),
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

describe('episodic memory source cleanup', () => {
	it('keeps legacy observation sources and drops entries that lose their last source', async () => {
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

describe('getEpisodicMemoryScope', () => {
	it('uses the persistence resource scope', () => {
		expect(getEpisodicMemoryScope({ resourceId: 'chat-user-1', threadId: 'thread-1' })).toEqual({
			resourceId: 'chat-user-1',
		});
	});
});
