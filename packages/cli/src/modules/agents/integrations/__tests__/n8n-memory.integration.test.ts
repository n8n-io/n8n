import {
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	type EpisodicMemoryScope,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
} from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { AgentMemoryEntryRepository } from '../../repositories/agent-memory-entry.repository';
import { AgentMemoryEntrySourceRepository } from '../../repositories/agent-memory-entry-source.repository';
import { AgentRepository } from '../../repositories/agent.repository';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';

describe('N8nMemoryImpl', () => {
	let repository: AgentThreadRepository;
	let memory: N8nMemoryImpl;
	let otherMemory: N8nMemoryImpl;
	let entryRepository: AgentMemoryEntryRepository;

	beforeAll(async () => {
		// The concurrent tests need real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentThreadRepository);
		entryRepository = Container.get(AgentMemoryEntryRepository);
		const project = await createTeamProject();
		const agentRepository = Container.get(AgentRepository);
		const agents = await agentRepository.save([
			agentRepository.create({ name: 'Memory agent', projectId: project.id, integrations: [] }),
			agentRepository.create({
				name: 'Other memory agent',
				projectId: project.id,
				integrations: [],
			}),
		]);
		memory = Container.get(N8nMemory).getImplementation(agents[0].id);
		otherMemory = Container.get(N8nMemory).getImplementation(agents[1].id);
	});

	beforeEach(async () => {
		await repository.delete({});
		await entryRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function readMetadata(): Promise<unknown> {
		const row = await repository.findOneByOrFail({ id: 'thread-1' });
		return jsonParse(row.metadata ?? 'null');
	}

	async function captureEntry(
		store: N8nMemoryImpl,
		scope: EpisodicMemoryScope,
		content = 'User prefers concise reports.',
		overrides: Partial<NewEpisodicMemoryEntry> = {},
	) {
		await store.saveThread({ id: scope.threadId, resourceId: scope.resourceId });
		const candidate = await store.episodic.enqueueCaptureCandidate({
			...scope,
			sourceMessageId: null,
			runId: crypto.randomUUID(),
			toolCallId: 'call-1',
			content,
			evidenceText: content,
			kind: 'preference',
		});
		const source: NewEpisodicMemoryEntrySourceForEntry = {
			candidateId: candidate.id,
			threadId: scope.threadId,
			evidenceText: candidate.evidenceText,
		};
		const entry = await store.episodic.saveEntryWithSources(
			{
				resourceId: scope.resourceId,
				content,
				embedding: [1, 0],
				embeddingModel: 'test-model',
				...overrides,
			},
			[source],
		);
		if (!entry) throw new Error('Expected an episodic entry');
		return { entry, source };
	}

	describe('saveThread', () => {
		it('keeps every write when saves and patches run at the same time', async () => {
			await memory.saveThread({ id: 'thread-1', resourceId: 'user-1', metadata: { count: 0 } });

			const patch = async () =>
				await memory.patchThread({
					threadId: 'thread-1',
					update: ({ metadata }) => ({
						metadata: { ...metadata, count: (metadata?.count as number) + 1 },
					}),
				});
			const touch = async () => await memory.saveThread({ id: 'thread-1', resourceId: 'user-1' });
			const save = async (i: number) =>
				await memory.saveThread({
					id: 'thread-1',
					resourceId: 'user-1',
					metadata: { [`key${i}`]: true },
				});

			await Promise.all(
				Array.from({ length: 10 }, async (_, i) => await Promise.all([patch(), touch(), save(i)])),
			);

			expect(await readMetadata()).toEqual({
				count: 10,
				...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`key${i}`, true])),
			});
		});

		it('writes nothing when the save carries no title or metadata', async () => {
			const created = await memory.saveThread({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: { keep: 1 },
			});

			const saved = await memory.saveThread({ id: 'thread-1', resourceId: 'user-2' });

			expect(saved).toMatchObject({ resourceId: 'user-1', title: 'Chat', metadata: { keep: 1 } });
			const row = await repository.findOneByOrFail({ id: 'thread-1' });
			expect(row.updatedAt.getTime()).toBe(created.updatedAt.getTime());
		});
	});

	describe('episodic memory', () => {
		const scope = { resourceId: 'user-1', threadId: 'thread-1' };

		it('looks up exact hashes by agent and write scope, including inactive entries', async () => {
			const { entry: owned } = await captureEntry(memory, scope);
			const { entry: otherAgent } = await captureEntry(otherMemory, scope);
			const { entry: otherResource } = await captureEntry(memory, {
				resourceId: 'user-2',
				threadId: 'thread-2',
			});
			const integrationScope = { resourceId: 'integration:slack:U_ALICE', threadId: 'shared-1' };
			const { entry: shared } = await captureEntry(memory, integrationScope);
			const { entry: otherThread } = await captureEntry(memory, {
				...integrationScope,
				threadId: 'shared-2',
			});
			await entryRepository.update(owned.id, { status: 'dropped' });
			await entryRepository.update(shared.id, {
				status: 'superseded',
				supersededBy: otherThread.id,
			});

			await expect(
				memory.episodic.getEntriesByContentHashes(scope, [owned.contentHash]),
			).resolves.toEqual([expect.objectContaining({ id: owned.id, status: 'dropped' })]);
			await expect(
				otherMemory.episodic.getEntriesByContentHashes(scope, [owned.contentHash]),
			).resolves.toEqual([expect.objectContaining({ id: otherAgent.id })]);
			await expect(
				memory.episodic.getEntriesByContentHashes({ ...scope, resourceId: 'user-2' }, [
					owned.contentHash,
				]),
			).resolves.toEqual([expect.objectContaining({ id: otherResource.id })]);
			await expect(
				memory.episodic.getEntriesByContentHashes(
					{ ...integrationScope, resourceId: 'integration:slack:U_BOB' },
					[owned.contentHash],
				),
			).resolves.toEqual([expect.objectContaining({ id: shared.id, status: 'superseded' })]);
			await expect(
				memory.episodic.getEntriesByContentHashes({ ...integrationScope, threadId: 'shared-2' }, [
					owned.contentHash,
				]),
			).resolves.toEqual([expect.objectContaining({ id: otherThread.id })]);
			await expect(
				memory.episodic.getEntriesByContentHashes(scope, ['missing-hash']),
			).resolves.toEqual([]);
			await expect(memory.episodic.getEntriesByContentHashes(scope, [])).resolves.toEqual([]);
		});

		it.each([
			{ name: 'missing', embedding: undefined, embeddingModel: undefined },
			{ name: 'empty', embedding: [], embeddingModel: 'test-model' },
			{ name: 'invalid', embedding: [Number.NaN, 0], embeddingModel: 'test-model' },
			{ name: 'different-model', embedding: [1, 0], embeddingModel: 'old-model' },
		])(
			'replaces a $name embedding without changing the original entry',
			async ({ embedding, embeddingModel }) => {
				const createdAt = new Date('2026-05-01T10:00:00.000Z');
				const { entry: original } = await captureEntry(memory, scope, undefined, {
					embedding,
					embeddingModel,
					createdAt,
					lastSeenAt: createdAt,
					metadata: { keep: true },
				});
				await entryRepository.update(original.id, { status: 'dropped', updatedAt: createdAt });
				const lastSeenAt = new Date('2026-05-12T11:00:00.000Z');
				const { entry: refreshed, source } = await captureEntry(
					memory,
					scope,
					'  USER prefers\nconcise reports. ',
					{
						embedding: [0, 1],
						embeddingModel: 'new-model',
						createdAt: lastSeenAt,
						lastSeenAt,
						metadata: { replace: true },
					},
				);

				expect(refreshed).toMatchObject({
					id: original.id,
					content: original.content,
					contentHash: hashEpisodicMemoryContent(original.content),
					createdAt,
					lastSeenAt,
					metadata: { keep: true },
					embedding: [0, 1],
					embeddingModel: 'new-model',
					status: 'active',
					supersededBy: null,
				});
				expect(refreshed.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
				const repeated = await memory.episodic.saveEntryWithSources(
					{ resourceId: scope.resourceId, content: original.content },
					[source],
				);
				expect(repeated).toMatchObject({
					id: original.id,
					embedding: [0, 1],
					embeddingModel: 'new-model',
					metadata: { keep: true },
				});
				await expect(memory.episodic.getEntrySources([original.id])).resolves.toHaveLength(2);
			},
		);

		it('keeps one entry and all sources when duplicate writes run concurrently', async () => {
			const first = await captureEntry(memory, scope);
			await entryRepository.delete(first.entry.id);
			const candidates = [first.source];
			for (let index = 0; index < 3; index++) {
				const candidate = await memory.episodic.enqueueCaptureCandidate({
					...scope,
					sourceMessageId: null,
					runId: `run-${index}`,
					toolCallId: 'call-1',
					content: first.entry.content,
					evidenceText: `Report preference ${index}`,
					kind: 'preference',
				});
				candidates.push({
					candidateId: candidate.id,
					threadId: scope.threadId,
					evidenceText: candidate.evidenceText,
				});
			}

			const saved = await Promise.all(
				candidates.map(
					async (source) =>
						await memory.episodic.saveEntryWithSources(
							{
								resourceId: scope.resourceId,
								content: first.entry.content,
								embedding: [1, 0],
								embeddingModel: 'test-model',
							},
							[source],
						),
				),
			);

			expect(await entryRepository.count()).toBe(1);
			const [entry] = await memory.episodic.getEntriesByContentHashes(scope, [
				first.entry.contentHash,
			]);
			expect(saved).toEqual(candidates.map(() => expect.objectContaining({ id: entry.id })));
			await expect(memory.episodic.getEntrySources([entry.id])).resolves.toHaveLength(4);
		});

		it('replays candidate and observation sources without losing new evidence', async () => {
			const { entry, source } = await captureEntry(memory, scope);
			const [observation] = await memory.appendObservationLogEntries([
				{
					observationScopeId: scope.threadId,
					marker: 'important',
					text: entry.content,
					createdAt: new Date(),
				},
			]);
			const observationSource: NewEpisodicMemoryEntrySourceForEntry = {
				observationId: observation.id,
				threadId: scope.threadId,
				evidenceText: entry.content,
			};
			const newEvidence = { ...source, evidenceText: 'Keep each report short.' };
			const replay = [source, source, observationSource, observationSource, newEvidence];

			await memory.episodic.saveEntryWithSources(
				{ resourceId: scope.resourceId, content: entry.content },
				replay,
			);
			const sources = await memory.episodic.getEntrySources([entry.id]);
			await memory.episodic.saveEntryWithSources(
				{ resourceId: scope.resourceId, content: entry.content, embedding: [0, 1] },
				replay,
			);

			await expect(memory.episodic.getEntrySources([entry.id])).resolves.toEqual(sources);
			expect(sources).toHaveLength(3);
			await expect(
				Container.get(AgentMemoryEntrySourceRepository).findBy({ memoryEntryId: entry.id }),
			).resolves.toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						evidenceText: newEvidence.evidenceText,
						evidenceHash: hashEpisodicMemoryEvidence(newEvidence.evidenceText),
					}),
				]),
			);
			await expect(
				memory.episodic.getEntriesByContentHashes(scope, [entry.contentHash]),
			).resolves.toEqual([
				expect.objectContaining({ id: entry.id, embedding: [0, 1], embeddingModel: 'test-model' }),
			]);
		});

		it.each([false, true])(
			'rolls back source failures when an entry already exists: %s',
			async (exists) => {
				const { entry, source } = await captureEntry(memory, scope);
				if (!exists) await entryRepository.delete(entry.id);
				const entriesBefore = await memory.episodic.getEntriesByContentHashes(scope, [
					entry.contentHash,
				]);
				const sourcesBefore = await memory.episodic.getEntrySources([entry.id]);

				await expect(
					memory.episodic.saveEntryWithSources(
						{
							resourceId: scope.resourceId,
							content: entry.content,
							embedding: [0, 1],
							embeddingModel: 'replacement-model',
						},
						[
							{ ...source, evidenceText: 'New evidence' },
							{ ...source, candidateId: 'missing-candidate' },
						],
					),
				).rejects.toThrow();

				await expect(
					memory.episodic.getEntriesByContentHashes(scope, [entry.contentHash]),
				).resolves.toEqual(entriesBefore);
				await expect(memory.episodic.getEntrySources([entry.id])).resolves.toEqual(sourcesBefore);
			},
		);
	});
});
