import { embed, embedMany } from 'ai';

import type {
	BuiltTelemetry,
	EpisodicMemoryConsolidateFn,
	EpisodicMemoryEntry,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySourceForEntry,
} from '../../types';
import {
	createRecallMemoryTool,
	encodeEpisodicScopeMetadata,
	EPISODIC_SCOPE_METADATA_KEY,
	getEpisodicMemoryScope,
	hashEpisodicMemoryContent,
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
/** Similar to every stored test embedding, so a search lists the active entries of a scope. */
const MATCH_ANY = [1, 1];

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
	const saved = await memory.episodic.saveEntryWithSources(
		{ embedding: new Float32Array([1, 0]), ...newEntry },
		sources,
	);
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
	overrides: Partial<{ content: string }> = {},
): Promise<void> {
	const tool = createFlagMemoryTool({
		memory,
		scope: { resourceId: 'user-1', threadId: 'thread-1' },
		persistence: { resourceId: 'user-1', threadId: 'thread-1' },
		list: sourceList(),
	});
	if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
	await tool.handler(
		{
			content: 'User prefers concise reports.',
			evidence: 'I prefer concise reports',
			...overrides,
		},
		{ runId, toolCallId },
	);
}

describe('rankEpisodicMemoryEntries', () => {
	it('ranks by similarity and ignores inactive entries by default', () => {
		const close = entry({
			id: 'close',
			content: 'Acme webhook retries',
			embedding: new Float32Array([1, 0]),
		});
		const far = entry({
			id: 'far',
			content: 'Acme webhook 429 delay',
			embedding: new Float32Array([0.6, 0.8]),
		});
		const superseded = entry({
			id: 'superseded',
			content: 'Acme webhook memory store was SQLite.',
			embedding: new Float32Array([1, 0]),
			status: 'superseded',
		});

		const results = rankEpisodicMemoryEntries([far, superseded, close], {
			queryEmbedding: [1, 0],
			topK: 5,
		});

		expect(results.map((result) => result.id)).toEqual(['close', 'far']);
		expect(results[0].vectorScore).toBeGreaterThan(results[1].vectorScore);
	});

	it('keeps only entries at or above the similarity floor', () => {
		// Cosine similarity to [1, 0]: 1, 0.8 and 0.3.
		const entries = [
			entry({ id: 'best', embedding: new Float32Array([1, 0]) }),
			entry({ id: 'related', embedding: new Float32Array([0.8, 0.6]) }),
			entry({ id: 'unrelated', embedding: new Float32Array([0.3, 0.95]) }),
		];

		const withFloor = rankEpisodicMemoryEntries(entries, {
			queryEmbedding: [1, 0],
			minSimilarity: 0.4,
		});
		const withoutFloor = rankEpisodicMemoryEntries(entries, { queryEmbedding: [1, 0] });

		expect(withFloor.map((result) => result.id)).toEqual(['best', 'related']);
		expect(withoutFloor).toHaveLength(3);
	});

	it('ranks a newer correction above the value it replaced when the floor is on', () => {
		const day = (n: number) => new Date(Date.UTC(2026, 5, n));
		const replaced = entry({
			id: 'replaced',
			embedding: new Float32Array([0.81, 0.586]),
			lastSeenAt: day(1),
		});
		const correction = entry({
			id: 'correction',
			embedding: new Float32Array([0.8, 0.6]),
			lastSeenAt: day(28),
		});
		// Weakly related entries below the floor still count for the recency rank.
		const weak = Array.from({ length: 40 }, (_, index) =>
			entry({
				embedding: new Float32Array([0.3, 0.954]),
				lastSeenAt: new Date(day(2).getTime() + index * 60_000),
			}),
		);

		const results = rankEpisodicMemoryEntries([replaced, correction, ...weak], {
			queryEmbedding: [1, 0],
			minSimilarity: 0.4,
		});

		expect(results.map((result) => result.id)).toEqual(['correction', 'replaced']);
	});

	it('returns nothing when no entry reaches the similarity floor', () => {
		const results = rankEpisodicMemoryEntries(
			[
				entry({ embedding: new Float32Array([0.3, 0.95]) }),
				entry({ embedding: new Float32Array([0.2, 0.98]) }),
			],
			{ queryEmbedding: [1, 0], minSimilarity: 0.4 },
		);

		expect(results).toEqual([]);
	});

	it('does not match on shared words alone', () => {
		// The words match the query exactly, but the meaning is unrelated.
		const wordMatch = entry({
			id: 'words',
			content: 'Acme webhook 429',
			embedding: new Float32Array([0.1, 0.99]),
		});
		const meaning = entry({
			id: 'meaning',
			content: 'Rate limits on Acme callbacks',
			embedding: new Float32Array([1, 0]),
		});

		const results = rankEpisodicMemoryEntries([wordMatch, meaning], {
			queryEmbedding: [1, 0],
			topK: 1,
		});

		expect(results.map((result) => result.id)).toEqual(['meaning']);
	});

	it('ranks the newer of two equally similar entries first', () => {
		const now = new Date();
		const older = entry({
			id: 'older',
			content: 'Billing contact is Dana.',
			embedding: new Float32Array([1, 0]),
			createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
			lastSeenAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		});
		const newer = entry({
			id: 'newer',
			content: 'Billing contact is now Priya.',
			embedding: new Float32Array([1, 0]),
			createdAt: now,
			lastSeenAt: now,
		});

		const results = rankEpisodicMemoryEntries([older, newer], { queryEmbedding: [1, 0], topK: 2 });

		expect(results.map((result) => result.id)).toEqual(['newer', 'older']);
	});

	it('returns no entries without a query embedding', () => {
		const stored = entry({
			id: 'stored',
			content: 'User chose Postgres.',
			embedding: new Float32Array([1, 0]),
		});

		expect(rankEpisodicMemoryEntries([stored], { topK: 5 })).toEqual([]);
	});
});

describe('createRecallMemoryTool', () => {
	it('strips retrieval metadata from the model-visible recall output', () => {
		const memory = new InMemoryMemory();
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
		});

		expect(
			tool.toModelOutput?.({
				entries: [
					{
						id: 'memory-1',
						content: 'User chose Postgres for durable memory storage.',
						createdAt: '2026-05-20T13:42:36.631Z',
						vectorScore: 0.6,
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

	it('keeps recalled entry ids in the trace output only', () => {
		const tool = createRecallMemoryTool({
			memory: new InMemoryMemory(),
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
		});

		expect(
			tool.toTraceOutput?.({
				entries: [
					{
						id: 'memory-1',
						content: 'User chose Postgres.',
						createdAt: '2026-05-20T13:42:36.631Z',
						lexicalScore: 0.3,
						vectorScore: 0.6,
						rrfScore: 0.04,
						finalScore: 0.04,
					},
				],
			}),
		).toEqual({ entryIds: ['memory-1'] });
	});

	it('recalls only entries relevant to the query', async () => {
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
		const memory = new InMemoryMemory();
		const scope = { resourceId: 'user-1', threadId: 'thread-1' };
		await saveEpisodicEntry(memory, {
			resourceId: 'user-1',
			content: 'Spend alerts go to Sin on Slack.',
			embedding: new Float32Array([1, 0]),
		});
		await saveEpisodicEntry(memory, {
			resourceId: 'user-1',
			content: 'User likes salmon.',
			embedding: new Float32Array([0.2, 0.98]),
		});
		const tool = createRecallMemoryTool({ memory, config: { embedder: fakeEmbedder }, scope });
		if (!tool.handler) throw new Error('Expected recall memory tool to have a handler');

		const output = await tool.handler({ query: 'who gets spend alerts?' }, {});

		expect(output).toEqual({
			entries: [expect.objectContaining({ content: 'Spend alerts go to Sin on Slack.' })],
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
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
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
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
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
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
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
			embedding: new Float32Array([1, 0]),
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
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
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
	it('scopes episodic memory by the persistence resource and thread', () => {
		expect(
			getEpisodicMemoryScope({
				resourceId: 'chat-user-1',
				threadId: 'thread-1',
			}),
		).toEqual({
			resourceId: 'chat-user-1',
			threadId: 'thread-1',
		});
	});

	it('carries the host-resolved scope from persistence metadata', () => {
		const episodic = { writeScopeId: 'slack:T1:C1', readScopeIds: ['slack:T1:C1'] };

		expect(
			getEpisodicMemoryScope({
				resourceId: 'integration:slack:U1',
				threadId: 'thread-1',
				hostMetadata: encodeEpisodicScopeMetadata(episodic),
			}),
		).toEqual({ resourceId: 'integration:slack:U1', threadId: 'thread-1', episodic });
	});

	it('returns no scope when the host turned episodic memory off for the turn', () => {
		expect(
			getEpisodicMemoryScope({
				resourceId: 'integration:slack:U1',
				threadId: 'thread-1',
				hostMetadata: encodeEpisodicScopeMetadata({ disabled: true }),
			}),
		).toBeNull();
	});

	it('turns episodic memory off when the carried scope is malformed', () => {
		expect(
			getEpisodicMemoryScope({
				resourceId: 'integration:slack:U1',
				threadId: 'thread-1',
				hostMetadata: { [EPISODIC_SCOPE_METADATA_KEY]: { writeScopeId: '' } },
			}),
		).toBeNull();
	});
});

describe('InMemoryMemory resolved episodic scope', () => {
	const inChannel = (channel: string) => ({
		resourceId: 'user-1',
		threadId: `thread-${channel}`,
		episodic: { writeScopeId: `channel:${channel}`, readScopeIds: [`channel:${channel}`] },
	});
	const content = 'The team chose Postgres.';

	async function saveIn(memory: InMemoryMemory, scope: ReturnType<typeof inChannel>) {
		const saved = await memory.episodic.saveEntryWithSources(
			{
				resourceId: scope.resourceId,
				episodic: scope.episodic,
				content,
				embedding: new Float32Array([1, 0]),
			},
			[
				{
					candidateId: `candidate-${scope.threadId}`,
					threadId: scope.threadId,
					evidenceText: content,
				},
			],
		);
		if (!saved) throw new Error('Expected an episodic entry');
		return saved;
	}

	it('keeps entries of one resource apart by their resolved scope', async () => {
		const memory = new InMemoryMemory();
		const one = inChannel('1');
		const two = inChannel('2');

		const first = await saveIn(memory, one);
		const second = await saveIn(memory, two);

		expect(first.id).not.toBe(second.id);
		expect(first.resourceId).toBe('channel:1');
		expect(second.resourceId).toBe('channel:2');
		const ids = async (scope: typeof one) =>
			(
				await memory.episodic.searchEntries(scope, 'team chose Postgres', {
					queryEmbedding: MATCH_ANY,
				})
			).map(({ id }) => id);
		expect(await ids(one)).toEqual([first.id]);
		expect(await ids(two)).toEqual([second.id]);
		expect(
			(
				await memory.episodic.getEntriesByContentHashes(one, [hashEpisodicMemoryContent(content)])
			).map(({ id }) => id),
		).toEqual([first.id]);
	});

	it('recalls a fact stored in two read scopes once, keeping the newest', async () => {
		const memory = new InMemoryMemory();
		const one = inChannel('1');
		const two = inChannel('2');
		const save = async (scope: typeof one, lastSeenAt: Date) =>
			await memory.episodic.saveEntryWithSources(
				{
					resourceId: scope.resourceId,
					episodic: scope.episodic,
					content,
					lastSeenAt,
					embedding: new Float32Array([1, 0]),
				},
				[
					{
						candidateId: `candidate-${scope.threadId}`,
						threadId: scope.threadId,
						evidenceText: content,
					},
				],
			);
		await save(one, new Date('2026-05-01T00:00:00Z'));
		const newer = await save(two, new Date('2026-05-09T00:00:00Z'));

		const results = await memory.episodic.searchEntries(
			{
				...one,
				episodic: { writeScopeId: 'channel:1', readScopeIds: ['channel:1', 'channel:2'] },
			},
			'team chose Postgres',
			{ queryEmbedding: MATCH_ANY },
		);

		expect(results.map(({ id }) => id)).toEqual([newer?.id]);
	});

	it('queues pending candidates and takes locks per resolved scope', async () => {
		const memory = new InMemoryMemory();
		const one = inChannel('1');
		const two = inChannel('2');

		const candidate = await memory.episodic.enqueueCaptureCandidate({
			...one,
			sourceMessageId: null,
			runId: 'run-1',
			toolCallId: 'call-1',
			content,
			evidenceText: content,
			kind: 'fact',
		});

		expect(candidate.resourceId).toBe('channel:1');
		expect(candidate).not.toHaveProperty('episodic');
		expect(await memory.episodic.getPendingCaptureCandidates(one)).toHaveLength(1);
		expect(await memory.episodic.getPendingCaptureCandidates(two)).toEqual([]);
		const options = { ttlMs: 60_000 };
		expect(
			await memory.episodic.taskLock?.acquire(one, { ...options, holderId: 'A' }),
		).not.toBeNull();
		expect(
			await memory.episodic.taskLock?.acquire(two, { ...options, holderId: 'B' }),
		).not.toBeNull();
		expect(await memory.episodic.taskLock?.acquire(one, { ...options, holderId: 'C' })).toBeNull();
	});

	it('limits reflection to the resolved scope', async () => {
		const memory = new InMemoryMemory();
		const one = inChannel('1');
		const entry = await saveIn(memory, one);

		const fromOtherScope = await memory.episodic.applyReflection(inChannel('2'), {
			drop: [entry.id],
			merge: [],
		});
		const fromOwnScope = await memory.episodic.applyReflection(one, {
			drop: [entry.id],
			merge: [],
		});

		expect(fromOtherScope.droppedIds).toEqual([]);
		expect(fromOwnScope.droppedIds).toEqual([entry.id]);
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
			memory.episodic.searchEntries(
				{ resourceId: 'user-1', threadId: 'thread-1' },
				'source-backed',
				{ queryEmbedding: MATCH_ANY, topK: 10 },
			),
		).resolves.toEqual([expect.objectContaining({ id: shared.id })]);
		const dropped = await memory.episodic.searchEntries(
			{ resourceId: 'user-1', threadId: 'thread-1' },
			'dropped entries',
			{ queryEmbedding: MATCH_ANY, includeStatuses: ['dropped'], topK: 10 },
		);
		expect(dropped).toHaveLength(2);
		expect(dropped).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: orphaned.id, status: 'dropped' }),
				expect.objectContaining({ id: candidateBacked.id, status: 'dropped' }),
			]),
		);
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1', threadId: 'thread-1' }),
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

	afterEach(() => {
		vi.useRealTimers();
	});

	it('stores every flag as a fact', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory, 'call-1', 'run-1');

		const candidates = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
			threadId: 'thread-1',
		});

		expect(candidates).toEqual([expect.objectContaining({ toolCallId: 'call-1', kind: 'fact' })]);
	});

	it('persists source evidence and deduplicates replayed tool calls within each run', async () => {
		const memory = new InMemoryMemory();
		await enqueueCandidate(memory);
		await enqueueCandidate(memory);
		await enqueueCandidate(memory, 'call-1', 'run-2');

		const candidates = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
			threadId: 'thread-1',
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
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list,
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
		await tool.handler(
			{ content: 'User prefers detailed reports.', evidence: 'I prefer detailed reports' },
			{ runId: 'run-1', toolCallId: 'call-2' },
		);

		// The current response is never evidence; the latest user message is used instead.
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1', threadId: 'thread-1' }),
		).resolves.toContainEqual(
			expect.objectContaining({
				toolCallId: 'call-2',
				sourceMessageId: 'message-1',
				evidenceText: 'Please remember that I prefer concise reports.',
			}),
		);
	});

	it('rejects a flag when the conversation has no user message to quote', async () => {
		const tool = createFlagMemoryTool({
			memory: new InMemoryMemory(),
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list: new AgentMessageList(),
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');

		await expect(
			tool.handler(
				{ content: 'User prefers detailed reports.', evidence: 'I prefer detailed reports' },
				{ runId: 'run-1', toolCallId: 'call-1' },
			),
		).rejects.toThrow('one contiguous quote');
	});

	it('resolves re-typed evidence to the verbatim span and falls back to the latest user message', async () => {
		const memory = new InMemoryMemory();
		const tool = createFlagMemoryTool({
			memory,
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list: sourceList('Remember this:\nDana’s invoices must CC ap@harborfinch.example.'),
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');
		const flag = async (evidence: string, toolCallId: string) =>
			await tool.handler!(
				{ content: 'Harbor & Finch invoices must CC ap@harborfinch.example.', evidence },
				{ runId: 'run-1', toolCallId },
			);

		await flag('"remember this: Dana\'s invoices must CC ap@harborfinch.example."', 'call-1');
		await flag('Dana said something else entirely.', 'call-2');

		const candidates = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
			threadId: 'thread-1',
		});
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
		const consolidate = vi.fn();

		await expect(
			runEpisodicMemoryCandidateProcessor({
				memory,
				config: { embedder: fakeEmbedder, consolidate },
				scope: { resourceId: 'user-1', threadId: 'thread-1' },
				now: new Date('2026-05-12T11:00:00.000Z'),
			}),
		).resolves.toEqual({
			status: 'ran',
			entriesWritten: 1,
			candidatesProcessed: 1,
			usageReports: expect.any(Array),
		});

		// A fact without similar stored entries must not pay for a model call.
		expect(consolidate).not.toHaveBeenCalled();
		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'user-1', threadId: 'thread-1' },
			'concise reports',
			{ queryEmbedding: MATCH_ANY },
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
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1', threadId: 'thread-1' }),
		).resolves.toEqual([]);
	});

	it.each(['active', 'dropped'] as const)(
		'reuses a stored %s entry and keeps evidence from both messages',
		async (status) => {
			const memory = new InMemoryMemory();
			const scope = { resourceId: 'user-1', threadId: 'thread-1' };
			const content = 'User prefers concise reports.';
			const earlier = await memory.episodic.enqueueCaptureCandidate({
				...scope,
				sourceMessageId: 'message-older',
				runId: 'earlier-run',
				toolCallId: 'earlier-call',
				content,
				evidenceText: 'Please keep reports concise.',
				kind: 'preference',
			});
			const createdAt = new Date('2026-05-01T10:00:00.000Z');
			const stored = await saveEpisodicEntry(
				memory,
				{
					resourceId: scope.resourceId,
					content,
					embedding: new Float32Array([1, 0]),
					embeddingModel: 'test-model',
					createdAt,
					lastSeenAt: createdAt,
					metadata: { keep: true },
				},
				[{ candidateId: earlier.id, threadId: scope.threadId, evidenceText: earlier.evidenceText }],
			);
			await memory.episodic.completeCaptureCandidates([earlier.id]);
			if (status === 'dropped') {
				await memory.episodic.applyReflection(scope, { drop: [stored.id], merge: [] });
			}
			await enqueueCandidate(memory);
			const onUsage = vi.fn();
			const now = new Date('2026-05-12T11:00:00.000Z');

			await expect(
				runEpisodicMemoryCandidateProcessor({
					memory,
					config: { embedder: fakeEmbedder, embeddingModel: 'test-model' },
					scope,
					now,
					onUsage,
				}),
			).resolves.toEqual({
				status: 'ran',
				entriesWritten: 1,
				candidatesProcessed: 1,
				usageReports: [],
			});

			expect(mockedEmbedMany).not.toHaveBeenCalled();
			expect(onUsage).not.toHaveBeenCalled();
			const entries = await memory.episodic.getEntriesByContentHashes(scope, [stored.contentHash]);
			expect(entries).toEqual([
				expect.objectContaining({
					id: stored.id,
					content,
					createdAt,
					lastSeenAt: now,
					status: 'active',
					supersededBy: null,
					metadata: { keep: true },
				}),
			]);
			const sources = await memory.episodic.getEntrySources([stored.id]);
			expect(sources).toHaveLength(2);
			expect(sources.map((source) => source.evidenceText)).toEqual(
				expect.arrayContaining([earlier.evidenceText, 'I prefer concise reports']),
			);
			expect(new Set(sources.map((source) => source.candidateId)).size).toBe(2);
			await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
		},
	);

	it('embeds distinct uncached hashes and saves every candidate in order', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const memory = new InMemoryMemory();
		const scope = { resourceId: 'user-1', threadId: 'thread-1' };
		const contents = [
			'User prefers concise reports.',
			'User prefers short weekly reports.',
			'  USER prefers short\nweekly reports. ',
			'The preferred reports use concise summaries.',
		];
		await saveEpisodicEntry(memory, {
			resourceId: scope.resourceId,
			content: contents[0],
			embedding: new Float32Array([1, 0]),
			embeddingModel: 'test-model',
		});
		for (const [index, content] of contents.entries()) {
			vi.setSystemTime(new Date(Date.UTC(2026, 4, 12, 10, 0, index)));
			await memory.episodic.enqueueCaptureCandidate({
				...scope,
				sourceMessageId: `message-${index}`,
				runId: 'run-1',
				toolCallId: `call-${index}`,
				content,
				evidenceText: `Report preference ${index}`,
				kind: 'preference',
			});
		}
		mockedEmbedMany.mockResolvedValue({
			embeddings: [
				[0, 1],
				[1, 1],
			],
			usage: { tokens: 6 },
		} as never);
		const lookup = vi.spyOn(memory.episodic, 'getEntriesByContentHashes');
		const save = vi.spyOn(memory.episodic, 'saveEntryWithSources');

		const result = await runEpisodicMemoryCandidateProcessor({
			memory,
			config: { embedder: fakeEmbedder, embeddingModel: 'test-model' },
			scope,
		});

		expect(lookup).toHaveBeenCalledExactlyOnceWith(scope, [
			hashEpisodicMemoryContent(contents[0]),
			hashEpisodicMemoryContent(contents[1]),
			hashEpisodicMemoryContent(contents[3]),
		]);
		expect(mockedEmbedMany).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ values: [contents[1], contents[3]] }),
		);
		expect(save.mock.calls.map(([candidate]) => [candidate.content, candidate.embedding])).toEqual([
			[contents[0], new Float32Array([1, 0])],
			[contents[1], new Float32Array([0, 1])],
			[contents[2], new Float32Array([0, 1])],
			[contents[3], new Float32Array([1, 1])],
		]);
		expect(result).toMatchObject({
			entriesWritten: 4,
			candidatesProcessed: 4,
			usageReports: [
				{
					task: 'episodic',
					model: 'test-model',
					usage: { promptTokens: 6, completionTokens: 0, totalTokens: 6 },
				},
			],
		});
		const entries = await memory.episodic.getEntriesByContentHashes(
			scope,
			contents.map(hashEpisodicMemoryContent),
		);
		expect(entries).toHaveLength(3);
		const sources = await memory.episodic.getEntrySources(entries.map((stored) => stored.id));
		expect(sources.filter((source) => source.candidateId)).toHaveLength(4);
		await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
	});

	it('returns cloned exact matches only from the requested resource', async () => {
		const memory = new InMemoryMemory();
		const scope = { resourceId: 'user-1', threadId: 'thread-1' };
		const stored = await saveEpisodicEntry(memory, {
			resourceId: scope.resourceId,
			content: 'User prefers concise reports.',
			embedding: new Float32Array([1, 0]),
		});
		await saveEpisodicEntry(memory, {
			resourceId: 'user-2',
			content: stored.content,
			embedding: new Float32Array([0, 1]),
		});
		const matches = await memory.episodic.getEntriesByContentHashes(scope, [stored.contentHash]);
		expect(matches).toEqual([stored]);
		matches[0].content = 'Changed outside the store';
		matches[0].embedding?.fill(2);
		matches[0].createdAt.setFullYear(2000);

		await expect(
			memory.episodic.getEntriesByContentHashes(scope, [stored.contentHash]),
		).resolves.toEqual([stored]);
		await expect(memory.episodic.getEntriesByContentHashes(scope, [])).resolves.toEqual([]);
	});

	it.each([
		{ name: 'missing vector', embedding: undefined, embeddingModel: 'test-model' },
		{ name: 'empty vector', embedding: new Float32Array([]), embeddingModel: 'test-model' },
		{
			name: 'NaN vector',
			embedding: new Float32Array([Number.NaN, 0]),
			embeddingModel: 'test-model',
		},
		{
			name: 'infinite vector',
			embedding: new Float32Array([1, Number.POSITIVE_INFINITY]),
			embeddingModel: 'test-model',
		},
		{ name: 'missing model', embedding: new Float32Array([1, 0]), embeddingModel: undefined },
		{ name: 'different model', embedding: new Float32Array([0, 1]), embeddingModel: 'old-model' },
	])(
		'refreshes a $name on the same entry and reuses it later',
		async ({ embedding, embeddingModel }) => {
			const memory = new InMemoryMemory();
			const scope = { resourceId: 'user-1', threadId: 'thread-1' };
			const stored = await saveEpisodicEntry(memory, {
				resourceId: scope.resourceId,
				content: 'USER prefers concise reports.',
				embedding,
				embeddingModel,
				createdAt: new Date('2026-05-01T10:00:00.000Z'),
				metadata: { keep: true },
			});
			await enqueueCandidate(memory);
			const options = {
				memory,
				config: { embedder: fakeEmbedder, embeddingModel: 'test-model' },
				scope,
			};

			await runEpisodicMemoryCandidateProcessor(options);

			expect(mockedEmbedMany).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ values: ['User prefers concise reports.'] }),
			);
			await expect(
				memory.episodic.getEntriesByContentHashes(scope, [stored.contentHash]),
			).resolves.toEqual([
				expect.objectContaining({
					id: stored.id,
					content: stored.content,
					createdAt: stored.createdAt,
					metadata: stored.metadata,
					embedding: new Float32Array([1, 0]),
					embeddingModel: 'test-model',
				}),
			]);
			await memory.episodic.saveEntryWithSources(
				{ resourceId: scope.resourceId, content: stored.content },
				[],
			);
			await enqueueCandidate(memory, 'call-2', 'run-2');
			mockedEmbedMany.mockClear();

			const repeat = await runEpisodicMemoryCandidateProcessor(options);

			expect(mockedEmbedMany).not.toHaveBeenCalled();
			expect(repeat).toMatchObject({ entriesWritten: 1, candidatesProcessed: 1, usageReports: [] });
		},
	);

	it('redacts candidate content and evidence before persistence', async () => {
		const memory = new InMemoryMemory();
		const secret = 'sk-ant-api03-aaaaaaaaaaaaaaaa';
		const tool = createFlagMemoryTool({
			memory,
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			persistence: { resourceId: 'user-1', threadId: 'thread-1' },
			list: sourceList(`Remember key ${secret}.`),
		});
		if (!tool.handler) throw new Error('Expected flag memory tool to have a handler');

		await tool.handler(
			{
				content: `The key is ${secret}.`,
				evidence: `key ${secret}`,
			},
			{ runId: 'run-1', toolCallId: 'secret-call' },
		);

		const [candidate] = await memory.episodic.getPendingCaptureCandidates({
			resourceId: 'user-1',
			threadId: 'thread-1',
		});
		expect(candidate.content).not.toContain(secret);
		expect(candidate.evidenceText).not.toContain(secret);
		expect(candidate.content).toContain('[REDACTED]');
	});

	it('retries partial persistence without duplicating entries or sources', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const memory = new InMemoryMemory();
		const onUsage = vi.fn();
		vi.setSystemTime(new Date('2026-05-12T10:00:00.000Z'));
		await enqueueCandidate(memory);
		vi.setSystemTime(new Date('2026-05-12T10:01:00.000Z'));
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
				scope: { resourceId: 'user-1', threadId: 'thread-1' },
				onUsage,
			}),
		).rejects.toThrow('temporary persistence failure');
		expect(onUsage).toHaveBeenCalledExactlyOnceWith('custom', {
			promptTokens: 6,
			completionTokens: 0,
			totalTokens: 6,
		});
		expect(onUsage.mock.invocationCallOrder[0]).toBeLessThan(saveSpy.mock.invocationCallOrder[0]);
		expect(mockedEmbedMany).toHaveBeenCalledTimes(1);
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1', threadId: 'thread-1' }),
		).resolves.toEqual([
			expect.objectContaining({ attemptCount: 1, status: 'pending' }),
			expect.objectContaining({ attemptCount: 1, status: 'pending' }),
		]);

		saveSpy.mockImplementation(save);
		mockedEmbedMany.mockResolvedValue({
			embeddings: [[0, 1]],
			usage: { tokens: 3 },
		} as never);
		await runEpisodicMemoryCandidateProcessor({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			onUsage,
		});
		expect(mockedEmbedMany).toHaveBeenCalledTimes(2);
		expect(mockedEmbedMany).toHaveBeenLastCalledWith(
			expect.objectContaining({ values: ['The preferred reports use concise summaries.'] }),
		);
		expect(onUsage).toHaveBeenCalledTimes(2);

		const entries = await memory.episodic.searchEntries(
			{ resourceId: 'user-1', threadId: 'thread-1' },
			'concise reports summaries',
			{ queryEmbedding: MATCH_ANY, topK: 10 },
		);
		expect(entries).toHaveLength(2);
		expect(entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: 'User prefers concise reports.',
					embedding: new Float32Array([1, 0]),
				}),
				expect.objectContaining({
					content: 'The preferred reports use concise summaries.',
					embedding: new Float32Array([0, 1]),
				}),
			]),
		);
		await expect(
			memory.episodic.getEntrySources(entries.map((entry) => entry.id)),
		).resolves.toHaveLength(2);
		await expect(
			memory.episodic.getPendingCaptureCandidates({ resourceId: 'user-1', threadId: 'thread-1' }),
		).resolves.toEqual([]);
	});

	it('never fails candidate processing when the embed onUsage throws or rejects', async () => {
		// Pricing is best-effort: a misbehaving onUsage callback (sync throw or
		// rejected promise) at the embed forwarding site must not abort
		// candidate processing or surface an unhandled rejection. Entries are
		// still saved.
		const syncThrow = vi.fn(() => {
			throw new Error('pricing sync boom');
		});
		const rejecting = vi.fn(async () => {
			throw new Error('pricing async boom');
		});

		for (const onUsage of [syncThrow, rejecting]) {
			const memory = new InMemoryMemory();
			await enqueueCandidate(memory);
			mockedEmbedMany.mockResolvedValue({
				embeddings: [[1, 0]],
				usage: { tokens: 6 },
			} as never);

			const result = await runEpisodicMemoryCandidateProcessor({
				memory,
				config: { embedder: fakeEmbedder },
				scope: { resourceId: 'user-1', threadId: 'thread-1' },
				onUsage,
			});

			expect(result).toMatchObject({ status: 'ran' });
			expect(onUsage).toHaveBeenCalledTimes(1);
			await expect(
				memory.episodic.searchEntries(
					{ resourceId: 'user-1', threadId: 'thread-1' },
					'concise reports',
					{ queryEmbedding: MATCH_ANY },
				),
			).resolves.toHaveLength(1);
		}
	});
});

describe('episodic memory consolidation', () => {
	const scope = { resourceId: 'user-1', threadId: 'thread-1' };
	const now = new Date('2026-05-12T11:00:00.000Z');
	const DUPLICATE = 'Invoices for Acme go to billing@acme.example.';
	const UPDATE = 'Acme renewal moved to 15 March.';
	const DIFFERENT = 'Acme uses Postgres 14 in eu-west-1.';
	const MERGED = 'Acme renewal is on 15 March.';
	const embeddings = new Map([
		[DUPLICATE, [1, 0, 0]],
		[UPDATE, [0, 1, 0]],
		[DIFFERENT, [0, 0, 1]],
		[MERGED, [0, 1, 0]],
		['Acme renewal is still on 1 March.', [0, 0.9, 0.1]],
	]);

	beforeEach(() => {
		vi.clearAllMocks();
		mockedEmbedMany.mockImplementation(
			(async ({ values }: { values: string[] }) =>
				await Promise.resolve({
					embeddings: values.map((value) => embeddings.get(value) ?? [0, 0, 0]),
					usage: { tokens: values.length },
				})) as never,
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function store(content: string, embedding: number[]): Promise<EpisodicMemoryEntry> {
		return await saveEpisodicEntry(memory, {
			resourceId: scope.resourceId,
			content,
			embedding: Float32Array.from(embedding),
		});
	}

	async function flag(content: string, toolCallId: string) {
		return await memory.episodic.enqueueCaptureCandidate({
			...scope,
			sourceMessageId: null,
			runId: 'run-1',
			toolCallId,
			content,
			evidenceText: `I said: ${content}`,
			kind: 'fact',
		});
	}

	async function process(consolidate: EpisodicMemoryConsolidateFn, onUsage = vi.fn()) {
		return await runEpisodicMemoryCandidateProcessor({
			memory,
			config: { embedder: fakeEmbedder, consolidate },
			scope,
			now,
			onUsage,
		});
	}

	async function entryWithContent(content: string): Promise<EpisodicMemoryEntry | undefined> {
		const [found] = await memory.episodic.getEntriesByContentHashes(scope, [
			hashEpisodicMemoryContent(content),
		]);
		return found;
	}

	let memory: InMemoryMemory;

	beforeEach(() => {
		memory = new InMemoryMemory();
	});

	it('applies duplicate, update, and different answers from one call per batch', async () => {
		const invoices = await store('Acme invoices go to billing@acme.example.', [1, 0, 0]);
		const renewal = await store('Acme renewal is on 1 March.', [0, 1, 0]);
		const database = await store('Acme uses Postgres 14.', [0, 0, 1]);
		const duplicate = await flag(DUPLICATE, 'call-1');
		const update = await flag(UPDATE, 'call-2');
		const different = await flag(DIFFERENT, 'call-3');
		const consolidate = vi.fn<EpisodicMemoryConsolidateFn>().mockResolvedValue({
			consolidation: {
				facts: [
					{
						candidateId: duplicate.id,
						relations: [{ entryId: invoices.id, relation: 'duplicate' }],
					},
					{
						candidateId: update.id,
						relations: [{ entryId: renewal.id, relation: 'update' }],
						mergedContent: ` ${MERGED.replace(' 15', '\n15')} `,
					},
					{
						// An unknown id and an update without merged content leave a new entry.
						candidateId: different.id,
						relations: [
							{ entryId: 'unknown-entry', relation: 'duplicate' },
							{ entryId: database.id, relation: 'update' },
						],
						mergedContent: null,
					},
				],
			},
			usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
			model: 'openai/gpt-4o-mini',
		});
		// Pricing is best-effort: a failing callback must not fail the batch.
		const onUsage = vi.fn(() => {
			throw new Error('pricing failed');
		});

		const result = await process(consolidate, onUsage);

		expect(result).toEqual({
			status: 'ran',
			entriesWritten: 3,
			candidatesProcessed: 3,
			usageReports: [
				{
					task: 'episodic',
					model: 'custom',
					usage: { promptTokens: 3, completionTokens: 0, totalTokens: 3 },
				},
				{
					task: 'episodic',
					model: 'openai/gpt-4o-mini',
					usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
				},
				{
					task: 'episodic',
					model: 'custom',
					usage: { promptTokens: 1, completionTokens: 0, totalTokens: 1 },
				},
			],
		});
		expect(onUsage).toHaveBeenCalledTimes(3);
		expect(consolidate).toHaveBeenCalledOnce();
		expect(consolidate.mock.calls[0][0].facts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					candidateId: duplicate.id,
					content: DUPLICATE,
					evidenceText: `I said: ${DUPLICATE}`,
					neighbours: [
						expect.objectContaining({ id: invoices.id, evidenceText: invoices.content }),
					],
				}),
				expect.objectContaining({
					candidateId: update.id,
					neighbours: [expect.objectContaining({ id: renewal.id })],
				}),
				expect.objectContaining({
					candidateId: different.id,
					neighbours: [expect.objectContaining({ id: database.id })],
				}),
			]),
		);

		await expect(entryWithContent(DUPLICATE)).resolves.toBeUndefined();
		await expect(entryWithContent(invoices.content)).resolves.toMatchObject({
			status: 'active',
			lastSeenAt: now,
		});
		await expect(memory.episodic.getEntrySources([invoices.id])).resolves.toEqual([
			expect.objectContaining({ candidateId: duplicate.id }),
			expect.objectContaining({ observationId: expect.any(String) }),
		]);

		const merged = await entryWithContent(MERGED);
		expect(merged).toMatchObject({ status: 'active', embedding: new Float32Array([0, 1, 0]) });
		await expect(entryWithContent(renewal.content)).resolves.toMatchObject({
			status: 'superseded',
			supersededBy: merged?.id,
		});
		await expect(memory.episodic.getEntrySources([merged!.id])).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ observationId: expect.any(String) }),
				expect.objectContaining({ candidateId: update.id }),
			]),
		);

		await expect(entryWithContent(DIFFERENT)).resolves.toMatchObject({ status: 'active' });
		await expect(entryWithContent(database.content)).resolves.toMatchObject({ status: 'active' });
		await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
	});

	it('saves every fact as a new entry when the consolidation call fails', async () => {
		const invoices = await store('Acme invoices go to billing@acme.example.', [1, 0, 0]);
		await flag(DUPLICATE, 'call-1');
		const consolidate = vi.fn<EpisodicMemoryConsolidateFn>().mockRejectedValue(new Error('down'));

		await expect(process(consolidate)).resolves.toMatchObject({
			status: 'ran',
			entriesWritten: 1,
		});

		expect(consolidate).toHaveBeenCalledOnce();
		await expect(entryWithContent(DUPLICATE)).resolves.toMatchObject({ status: 'active' });
		await expect(memory.episodic.getEntrySources([invoices.id])).resolves.toHaveLength(1);
		await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
	});

	it('saves a fact as new when an earlier fact of the batch replaced its stored entry', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-05-12T10:00:00.000Z'));
		const renewal = await store('Acme renewal is on 1 March.', [0, 1, 0]);
		const update = await flag(UPDATE, 'call-1');
		vi.setSystemTime(new Date('2026-05-12T10:01:00.000Z'));
		const repeat = await flag('Acme renewal is still on 1 March.', 'call-2');
		const consolidate = vi.fn<EpisodicMemoryConsolidateFn>().mockResolvedValue({
			consolidation: {
				facts: [
					{
						candidateId: update.id,
						relations: [{ entryId: renewal.id, relation: 'update' }],
						mergedContent: MERGED,
					},
					{
						candidateId: repeat.id,
						relations: [{ entryId: renewal.id, relation: 'duplicate' }],
					},
				],
			},
			model: 'openai/gpt-4o-mini',
		});

		await expect(process(consolidate)).resolves.toMatchObject({ entriesWritten: 2 });

		await expect(entryWithContent(MERGED)).resolves.toMatchObject({ status: 'active' });
		await expect(entryWithContent(repeat.content)).resolves.toMatchObject({ status: 'active' });
		await expect(memory.episodic.getEntrySources([renewal.id])).resolves.toHaveLength(1);
	});

	it('writes nothing for a deleted candidate on the duplicate and update paths', async () => {
		const invoices = await store('Acme invoices go to billing@acme.example.', [1, 0, 0]);
		const renewal = await store('Acme renewal is on 1 March.', [0, 1, 0]);
		const duplicate = await flag(DUPLICATE, 'call-1');
		const update = await flag(UPDATE, 'call-2');
		// A store returns these results when a user deleted the candidate.
		const addSources = vi.spyOn(memory.episodic, 'addEntrySources').mockResolvedValue(null);
		const merge = vi
			.spyOn(memory.episodic, 'applyReflection')
			.mockResolvedValue({ droppedIds: [], supersededIds: [], inserted: [] });
		const save = vi.spyOn(memory.episodic, 'saveEntryWithSources').mockResolvedValue(null);
		const consolidate = vi.fn<EpisodicMemoryConsolidateFn>().mockResolvedValue({
			consolidation: {
				facts: [
					{
						candidateId: duplicate.id,
						relations: [{ entryId: invoices.id, relation: 'duplicate' }],
					},
					{
						candidateId: update.id,
						relations: [{ entryId: renewal.id, relation: 'update' }],
						mergedContent: MERGED,
					},
				],
			},
			model: 'openai/gpt-4o-mini',
		});

		await expect(process(consolidate)).resolves.toMatchObject({
			entriesWritten: 0,
			candidatesProcessed: 2,
		});

		const candidateSource = (id: string) => [expect.objectContaining({ candidateId: id })];
		expect(addSources).toHaveBeenCalledWith(invoices.id, candidateSource(duplicate.id), now);
		expect(merge).toHaveBeenCalledWith(scope, {
			drop: [],
			merge: [
				expect.objectContaining({
					supersedes: [renewal.id],
					entry: expect.objectContaining({ content: MERGED }),
					sources: candidateSource(update.id),
				}),
			],
		});
		expect(save).toHaveBeenCalledTimes(2);
		await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
	});
});
