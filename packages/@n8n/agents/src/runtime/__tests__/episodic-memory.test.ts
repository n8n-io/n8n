import { embed, embedMany } from 'ai';

import type {
	EpisodicMemoryEntry,
	EpisodicMemoryExtractFn,
	EpisodicMemoryReflectFn,
} from '../../types';
import {
	createRecallMemoryTool,
	getEpisodicMemoryScope,
	rankEpisodicMemoryEntries,
	runEpisodicMemoryIndexer,
} from '../episodic-memory';
import { AgentEventBus } from '../event-bus';
import { InMemoryMemory } from '../memory-store';

jest.mock('ai', () => ({
	embed: jest.fn(),
	embedMany: jest.fn(),
}));

const mockedEmbed = jest.mocked(embed);
const mockedEmbedMany = jest.mocked(embedMany);
const fakeEmbedder = { specificationVersion: 'v2' } as never;

function entry(overrides: Partial<EpisodicMemoryEntry> = {}): EpisodicMemoryEntry {
	const now = new Date('2026-05-12T10:00:00.000Z');
	return {
		id: overrides.id ?? crypto.randomUUID(),
		agentId: overrides.agentId ?? 'agent-1',
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

	it('ignores low-positive vector scores without lexical relevance', () => {
		const weakVector = entry({
			id: 'weak-vector',
			content: 'User chose Postgres for durable memory storage.',
			embedding: [0.01, 1],
		});
		const strongVector = entry({
			id: 'strong-vector',
			content: 'Warehouse exception routing analysis used manager escalation history.',
			embedding: [0.8, 0.6],
		});

		const results = rankEpisodicMemoryEntries(
			[weakVector, strongVector],
			'prior travel itinerary hotel booking',
			{ queryEmbedding: [1, 0], topK: 5 },
		);

		expect(results.map((result) => result.id)).toEqual(['strong-vector']);
	});
});

describe('createRecallMemoryTool', () => {
	it('instructs the model to call recall_memory only for explicit prior-context asks', () => {
		const memory = new InMemoryMemory();
		const tool = createRecallMemoryTool({
			memory,
			config: { embedder: fakeEmbedder },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
		});

		expect(tool.systemInstruction).toContain('Only call recall_memory');
		expect(tool.systemInstruction).toContain('explicitly asks');
		expect(tool.systemInstruction).not.toContain('<episodic_memory>');
		expect(tool.systemInstruction).toContain('current user message');
		expect(tool.systemInstruction).toContain('current thread history');
		expect(tool.systemInstruction).toContain('current observations');
		expect(tool.systemInstruction).toContain('find related prior entries');
		expect(tool.systemInstruction).toContain('not answer from memory');
		expect(tool.systemInstruction).toContain('complete lists');
		expect(tool.systemInstruction).toContain('exact names');
		expect(tool.description).toContain('prior artifacts');
	});
});

describe('getEpisodicMemoryScope', () => {
	it('uses the episodic-specific resource partition when provided', () => {
		expect(
			getEpisodicMemoryScope({
				agentId: 'agent-1',
				resourceId: 'chat-user-1',
				threadId: 'thread-1',
				episodicMemoryResourceId: 'integration:slack:thread-1',
			}),
		).toEqual({
			agentId: 'agent-1',
			resourceId: 'integration:slack:thread-1',
		});
	});

	it('falls back to the persistence resourceId for existing SDK callers', () => {
		expect(
			getEpisodicMemoryScope({
				agentId: 'agent-1',
				resourceId: 'chat-user-1',
				threadId: 'thread-1',
			}),
		).toEqual({
			agentId: 'agent-1',
			resourceId: 'chat-user-1',
		});
	});
});

describe('InMemoryMemory episodic source cleanup', () => {
	it('drops active entries that lose their last source when deleting a thread', async () => {
		const memory = new InMemoryMemory();
		const [orphaned, shared] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'User chose Postgres for durable memory storage.',
			},
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'User prefers source-backed cross-session recall.',
			},
		]);
		await memory.saveEpisodicMemoryEntrySources([
			{
				memoryEntryId: orphaned.id,
				observationId: 'obs-orphaned',
				threadId: 'thread-1',
				evidenceText: 'User chose Postgres',
			},
			{
				memoryEntryId: shared.id,
				observationId: 'obs-shared-1',
				threadId: 'thread-1',
				evidenceText: 'source-backed',
			},
			{
				memoryEntryId: shared.id,
				observationId: 'obs-shared-2',
				threadId: 'thread-2',
				evidenceText: 'cross-session recall',
			},
		]);

		await memory.deleteThread('thread-1');

		await expect(
			memory.searchEpisodicMemoryEntries(
				{ agentId: 'agent-1', resourceId: 'user-1' },
				'source-backed',
				{ topK: 10 },
			),
		).resolves.toEqual([expect.objectContaining({ id: shared.id })]);
		await expect(
			memory.searchEpisodicMemoryEntries(
				{ agentId: 'agent-1', resourceId: 'user-1' },
				'Postgres storage',
				{ includeStatuses: ['dropped'], topK: 10 },
			),
		).resolves.toEqual([expect.objectContaining({ id: orphaned.id, status: 'dropped' })]);
	});
});

describe('runEpisodicMemoryIndexer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedEmbedMany.mockResolvedValue({ embeddings: [[1, 0]], usage: { tokens: 1 } } as never);
		mockedEmbed.mockResolvedValue({ embedding: [1, 0], usage: { tokens: 1 } } as never);
	});

	it('indexes new active observations and advances the cursor', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User switched memory store to Postgres after ruling out SQLite for enterprise customers.',
				createdAt: new Date('2026-05-12T10:00:00.000Z'),
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content:
							'User switched memory store to Postgres after ruling out SQLite for enterprise customers.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'User switched memory store to Postgres',
							},
						],
					},
				],
			});

		const result = await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
			now: new Date('2026-05-12T10:01:00.000Z'),
		});

		expect(result).toEqual({ status: 'ran', entriesWritten: 1, observationsIndexed: 1 });
		const stored = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'Postgres enterprise',
			{ queryEmbedding: [1, 0] },
		);
		expect(stored).toHaveLength(1);
		expect(stored[0].content).toContain('Postgres');
		await expect(
			runEpisodicMemoryIndexer({
				memory,
				config: { embedder: fakeEmbedder, extract },
				scope: { agentId: 'agent-1', resourceId: 'user-1' },
				observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
				threadId: 'thread-1',
				eventBus: new AgentEventBus(),
			}),
		).resolves.toEqual({ status: 'skipped', reason: 'no-observations' });
	});

	it('does not leave searchable entries behind when source persistence fails', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User chose Postgres for cross-session memory.',
				createdAt: new Date('2026-05-12T10:00:00.000Z'),
			},
		]);
		const sourceError = new Error('source write failed');
		jest.spyOn(memory, 'saveEpisodicMemoryEntrySources').mockRejectedValueOnce(sourceError);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User chose Postgres for cross-session memory.',
						sources: [{ observationId: observation.id, evidence: 'User chose Postgres' }],
					},
				],
			});

		await expect(
			runEpisodicMemoryIndexer({
				memory,
				config: { embedder: fakeEmbedder, extract },
				scope: { agentId: 'agent-1', resourceId: 'user-1' },
				observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
				threadId: 'thread-1',
				eventBus: new AgentEventBus(),
				now: new Date('2026-05-12T10:01:00.000Z'),
			}),
		).rejects.toThrow(sourceError);

		await expect(
			memory.searchEpisodicMemoryEntries(
				{ agentId: 'agent-1', resourceId: 'user-1' },
				'Postgres memory',
			),
		).resolves.toEqual([]);
		await expect(
			memory.getEpisodicMemoryCursor({
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
			}),
		).resolves.toBeNull();
	});

	it('stores exact evidence for each source observation', async () => {
		const memory = new InMemoryMemory();
		const [decision, reason] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'critical',
				text: 'User chose Postgres for the memory store.',
			},
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'Enterprise customers will not run local storage.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content:
							'User chose Postgres for the memory store because enterprise customers will not run local storage.',
						sources: [
							{
								observationId: decision.id,
								evidence: 'User chose Postgres for the memory store',
							},
							{
								observationId: reason.id,
								evidence: 'Enterprise customers will not run local storage',
							},
						],
					},
				],
			});

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const sources = Reflect.get(memory, 'episodicMemorySources') as Array<{
			observationId: string;
			evidenceText: string;
		}>;
		expect(sources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					observationId: decision.id,
					evidenceText: 'User chose Postgres for the memory store',
				}),
				expect.objectContaining({
					observationId: reason.id,
					evidenceText: 'Enterprise customers will not run local storage',
				}),
			]),
		);
	});

	it('stores extracted entries longer than 800 characters without truncating them', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'critical',
				text: 'User settled the Harborlight vendor intake pilot details.',
			},
		]);
		const longContent = `${'Harborlight vendor intake detail. '.repeat(30)}Final retained identifier VENDORSTATUSCOMPLETE`;
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: longContent,
						sources: [
							{
								observationId: observation.id,
								evidence: 'Harborlight vendor intake pilot details',
							},
						],
					},
				],
			});

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const [stored] = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'VENDORSTATUSCOMPLETE',
			{ topK: 1 },
		);
		expect(stored.content).toBe(longContent);
		expect(stored.content.length).toBeGreaterThan(800);
	});

	it('rejects extracted entries that are not backed by observation evidence', async () => {
		const memory = new InMemoryMemory();
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User investigated webhook retries.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'Webhook retries were caused by a bad API key.',
						sources: [{ observationId: observation.id, evidence: 'bad API key' }],
					},
				],
			});

		const result = await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		expect(result).toEqual({ status: 'ran', entriesWritten: 0, observationsIndexed: 1 });
		await expect(
			memory.searchEpisodicMemoryEntries({ agentId: 'agent-1', resourceId: 'user-1' }, 'API key'),
		).resolves.toEqual([]);
	});

	it('does not index failed recall attempts as episodic memories', async () => {
		const memory = new InMemoryMemory();
		const [request, toolResult, reply] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User wants to continue an earlier memory feature discussion and recover prior decisions.',
			},
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'info',
				text: 'Agent queried memory; no entries were found.',
			},
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'completion',
				text: 'Agent told user it could not reliably recover finalized decisions.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content:
							'User tried to recover prior memory feature decisions, but memory lookup found no entries and the agent could not reliably recover finalized decisions.',
						sources: [
							{
								observationId: request.id,
								evidence: 'User wants to continue an earlier memory feature discussion',
							},
							{
								observationId: toolResult.id,
								evidence: 'Agent queried memory; no entries were found.',
							},
							{
								observationId: reply.id,
								evidence: 'could not reliably recover finalized decisions',
							},
						],
					},
				],
			});

		const result = await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		expect(result).toEqual({ status: 'ran', entriesWritten: 0, observationsIndexed: 3 });
		await expect(
			memory.searchEpisodicMemoryEntries(
				{ agentId: 'agent-1', resourceId: 'user-1' },
				'memory feature decisions',
			),
		).resolves.toEqual([]);
	});

	it('ignores legacy extractor supersedes and keeps lifecycle decisions in reflection', async () => {
		const memory = new InMemoryMemory();
		const [oldEntry] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'User planned SQLite for local-first memory storage.',
				embedding: [1, 0],
			},
		]);
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'critical',
				text: 'User switched memory store choice to Postgres.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User switched memory store choice to Postgres.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'User switched memory store choice to Postgres',
							},
						],
						supersedes: [oldEntry.id],
					} as never,
				],
			});

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const entries = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'SQLite Postgres memory storage',
			{ includeStatuses: ['active', 'superseded'], queryEmbedding: [1, 0], topK: 10 },
		);
		expect(entries.find((entry) => entry.id === oldEntry.id)?.status).toBe('active');
	});

	it('reflects same-case entries into a replacement and copies source links', async () => {
		const memory = new InMemoryMemory();
		const [oldEntry] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'User planned SQLite for local-first memory storage.',
				embedding: [1, 0],
			},
		]);
		await memory.saveEpisodicMemoryEntrySources([
			{
				memoryEntryId: oldEntry.id,
				observationId: 'obs-old',
				threadId: 'thread-old',
				evidenceText: 'User planned SQLite',
			},
		]);
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'critical',
				text: 'User switched memory store choice to Postgres after enterprise constraints.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User switched memory store choice to Postgres after enterprise constraints.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'User switched memory store choice to Postgres',
							},
						],
					},
				],
			});
		const reflect: EpisodicMemoryReflectFn = async (input) => {
			const seedId = input.seedEntryIds[0];
			return await Promise.resolve({
				drop: [],
				merge: [
					{
						supersedes: [oldEntry.id, seedId],
						content:
							'User switched memory store choice from SQLite to Postgres after enterprise constraints.',
					},
				],
			});
		};
		mockedEmbedMany.mockResolvedValue({
			embeddings: [
				[1, 0],
				[0.9, 0.1],
			],
			usage: { tokens: 2 },
		} as never);

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract, reflect },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const active = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'Postgres enterprise constraints',
			{ queryEmbedding: [1, 0], topK: 10 },
		);
		expect(active).toHaveLength(1);
		expect(active[0].content).toContain('from SQLite to Postgres');

		const inactive = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'SQLite Postgres',
			{ includeStatuses: ['superseded'], queryEmbedding: [1, 0], topK: 10 },
		);
		expect(inactive).toHaveLength(2);
		expect(new Set(inactive.map((entry) => entry.supersededBy))).toEqual(new Set([active[0].id]));

		const sources = Reflect.get(memory, 'episodicMemorySources') as Array<{
			memoryEntryId: string;
			observationId: string;
			evidenceText: string;
		}>;
		expect(sources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					memoryEntryId: active[0].id,
					observationId: 'obs-old',
					evidenceText: 'User planned SQLite',
				}),
				expect.objectContaining({
					memoryEntryId: active[0].id,
					observationId: observation.id,
					evidenceText: 'User switched memory store choice to Postgres',
				}),
			]),
		);
	});

	it('stores reflection merge replacements longer than 800 characters without truncating them', async () => {
		const memory = new InMemoryMemory();
		const [oldEntry] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'User planned a Harborlight vendor intake pilot.',
				embedding: [1, 0],
			},
		]);
		await memory.saveEpisodicMemoryEntrySources([
			{
				memoryEntryId: oldEntry.id,
				observationId: 'obs-old',
				threadId: 'thread-old',
				evidenceText: 'Harborlight vendor intake pilot',
			},
		]);
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'critical',
				text: 'User added final Harborlight ownership details.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User added final Harborlight ownership details.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'final Harborlight ownership details',
							},
						],
					},
				],
			});
		const longReplacement = `${'Harborlight reflected ownership detail. '.repeat(25)}Final reflected identifier REFLECTEDVENDORSTATUSCOMPLETE`;
		const reflect: EpisodicMemoryReflectFn = async (input) =>
			await Promise.resolve({
				drop: [],
				merge: [
					{
						supersedes: [oldEntry.id, input.seedEntryIds[0]],
						content: longReplacement,
					},
				],
			});

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract, reflect },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const [stored] = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'REFLECTEDVENDORSTATUSCOMPLETE',
			{ topK: 1 },
		);
		expect(stored.content).toBe(longReplacement);
		expect(stored.content.length).toBeGreaterThan(800);
	});

	it('reflects obvious noise as dropped and excludes it from active search', async () => {
		const memory = new InMemoryMemory();
		const [noise] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'Agent queried memory and no entries were found.',
				embedding: [1, 0],
			},
		]);
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User confirmed the Postgres memory store decision.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User confirmed the Postgres memory store decision.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'User confirmed the Postgres memory store decision',
							},
						],
					},
				],
			});
		const reflect: EpisodicMemoryReflectFn = async () =>
			await Promise.resolve({ drop: [noise.id], merge: [] });

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract, reflect },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const active = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'no entries found',
			{ queryEmbedding: [1, 0], topK: 10 },
		);
		expect(active.map((entry) => entry.id)).not.toContain(noise.id);
		const [dropped] = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'no entries found',
			{ includeStatuses: ['dropped'], queryEmbedding: [1, 0] },
		);
		expect(dropped.id).toBe(noise.id);
	});

	it('ignores invalid reflection actions and keeps similar distinct cases active', async () => {
		const memory = new InMemoryMemory();
		const [northstar] = await memory.saveEpisodicMemoryEntries([
			{
				agentId: 'agent-1',
				resourceId: 'user-1',
				content: 'Northstar routing issue was caused by stale manager email mappings.',
				embedding: [1, 0],
			},
		]);
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'Southeast invoice requests are delayed before routing starts.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'Southeast invoice requests are delayed before routing starts.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'Southeast invoice requests are delayed',
							},
						],
					},
				],
			});
		const reflect: EpisodicMemoryReflectFn = async () =>
			await Promise.resolve({
				drop: ['missing-entry'],
				merge: [
					{ supersedes: ['missing-entry'], content: 'Invalid replacement.' },
					{ supersedes: [northstar.id], content: '   ' },
				],
			});

		await runEpisodicMemoryIndexer({
			memory,
			config: { embedder: fakeEmbedder, extract, reflect },
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
			threadId: 'thread-1',
			eventBus: new AgentEventBus(),
		});

		const active = await memory.searchEpisodicMemoryEntries(
			{ agentId: 'agent-1', resourceId: 'user-1' },
			'Northstar Southeast routing invoice',
			{ queryEmbedding: [1, 0], topK: 10 },
		);
		expect(active.map((entry) => entry.id)).toEqual(expect.arrayContaining([northstar.id]));
		expect(active.map((entry) => entry.content)).toEqual(
			expect.arrayContaining([expect.stringContaining('Southeast invoice requests are delayed')]),
		);
	});

	it('keeps saved entries and advances the cursor when reflection fails', async () => {
		const memory = new InMemoryMemory();
		const eventBus = new AgentEventBus();
		const [observation] = await memory.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
				marker: 'important',
				text: 'User confirmed the Postgres memory store decision.',
			},
		]);
		const extract: EpisodicMemoryExtractFn = async () =>
			await Promise.resolve({
				entries: [
					{
						content: 'User confirmed the Postgres memory store decision.',
						sources: [
							{
								observationId: observation.id,
								evidence: 'User confirmed the Postgres memory store decision',
							},
						],
					},
				],
			});
		const reflect: EpisodicMemoryReflectFn = () => {
			throw new Error('reflect failed');
		};

		await expect(
			runEpisodicMemoryIndexer({
				memory,
				config: { embedder: fakeEmbedder, extract, reflect },
				scope: { agentId: 'agent-1', resourceId: 'user-1' },
				observationScope: { scopeKind: 'thread', scopeId: 'thread:thread-1:resource:user-1' },
				threadId: 'thread-1',
				eventBus,
			}),
		).rejects.toThrow('reflect failed');

		await expect(
			memory.searchEpisodicMemoryEntries(
				{ agentId: 'agent-1', resourceId: 'user-1' },
				'Postgres memory store',
				{ queryEmbedding: [1, 0] },
			),
		).resolves.toHaveLength(1);
		await expect(
			memory.getEpisodicMemoryCursor({
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
			}),
		).resolves.toMatchObject({ lastIndexedObservationId: observation.id });
	});
});
