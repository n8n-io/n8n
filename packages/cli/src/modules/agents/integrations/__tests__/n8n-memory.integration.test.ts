import {
	encodeEpisodicScopeMetadata,
	getEpisodicMemoryScope,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	type EpisodicMemoryScope,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
	type ObservationCursor,
	type ObservationLogBatch,
	type ResolvedEpisodicScope,
} from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentObservationEntity } from '../../entities/agent-observation.entity';
import { AgentMemoryEntryRepository } from '../../repositories/agent-memory-entry.repository';
import { AgentMemoryEntrySourceRepository } from '../../repositories/agent-memory-entry-source.repository';
import { AgentObservationRepository } from '../../repositories/agent-observation.repository';
import { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { AgentRepository } from '../../repositories/agent.repository';
import { integrationMemoryResourceId } from '../../utils/agent-memory-scope';
import type { EpisodicScopeContext } from '../agent-chat-integration';
import {
	encodeIntegrationMessageContext,
	readIntegrationMessageContext,
} from '../integration-message-context';
import {
	createIntegrationActionTool,
	getIntegrationToolConnectionDescriptors,
	type IntegrationActionExecutor,
	type IntegrationMessageContext,
	type IntegrationMessageContextStore,
} from '../integration-tools';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';
import { SlackIntegration } from '../platforms/slack/slack-integration';

describe('N8nMemoryImpl', () => {
	let repository: AgentThreadRepository;
	let memory: N8nMemoryImpl;
	let otherMemory: N8nMemoryImpl;
	let observations: AgentObservationRepository;
	let entryRepository: AgentMemoryEntryRepository;
	let agentId: string;
	let otherAgentId: string;

	beforeAll(async () => {
		// The concurrent tests need real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentThreadRepository);
		observations = Container.get(AgentObservationRepository);
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
		agentId = agents[0].id;
		otherAgentId = agents[1].id;
		memory = Container.get(N8nMemory).getImplementation(agentId);
		otherMemory = Container.get(N8nMemory).getImplementation(otherAgentId);
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

	describe('commitObservationLogBatch', () => {
		const now = new Date('2026-05-12T10:00:00.000Z');

		beforeEach(async () => {
			await memory.saveThread({ id: 'thread-1', resourceId: 'user-1' });
			await memory.saveThread({ id: 'thread-2', resourceId: 'user-1' });
		});

		function batch(
			expectedCursor: ObservationCursor | null = null,
			observationScopeId = 'thread-1',
		): ObservationLogBatch {
			return {
				observationScopeId,
				expectedCursor,
				nextCursor: {
					observationScopeId,
					lastObservedMessageId: 'm2',
					lastObservedAt: new Date(2),
					updatedAt: now,
				},
				entries: [
					{
						marker: 'important',
						text: 'Decision',
						parentIndex: null,
						tokenCount: 2,
						createdAt: now,
					},
					{
						marker: 'completion',
						text: 'Done',
						parentIndex: 0,
						tokenCount: 3,
						createdAt: new Date(now.getTime() + 1),
					},
				],
			};
		}

		it('persists a complete ordered batch and rejects its replay', async () => {
			const input = batch();
			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			const rows = await memory.getObservationLog(input);
			expect(rows).toMatchObject([
				{ text: 'Decision', parentId: null, tokenCount: 2, createdAt: now },
				{
					text: 'Done',
					parentId: rows[0].id,
					tokenCount: 3,
					createdAt: new Date(now.getTime() + 1),
				},
			]);
			expect(await memory.getCursor('thread-1')).toEqual(input.nextCursor);
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await memory.getObservationLog(input)).toEqual(rows);
		});

		it('advances a cursor-only batch without changing active observations', async () => {
			await memory.commitObservationLogBatch(batch());
			const input = batch(await memory.getCursor('thread-1'));
			const rows = await memory.getActiveObservationLog(input);
			input.entries = [];
			input.nextCursor.lastObservedMessageId = 'm3';
			input.nextCursor.lastObservedAt = new Date(3);

			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			expect(await memory.getCursor('thread-1')).toEqual({
				...input.nextCursor,
				updatedAt: new Date(now.getTime() + 1),
			});
			expect(await memory.getObservationLog(input)).toEqual(rows);
		});

		it.each([false, true])(
			'accepts only one competing writer with an existing cursor: %s',
			async (existing) => {
				if (existing) await memory.commitObservationLogBatch(batch());
				const input = batch(await memory.getCursor('thread-1'));
				if (existing) {
					input.nextCursor.lastObservedMessageId = 'm3';
					input.nextCursor.lastObservedAt = new Date(3);
					input.nextCursor.updatedAt = new Date(0);
				}
				const results = await Promise.all([
					memory.commitObservationLogBatch(input),
					memory.commitObservationLogBatch(input),
				]);
				expect(results.sort()).toEqual(['committed', 'stale']);
				expect(await memory.getObservationLog(input)).toHaveLength(existing ? 4 : 2);
				expect(await memory.getCursor('thread-1')).toEqual({
					...input.nextCursor,
					updatedAt: new Date(now.getTime() + (existing ? 1 : 0)),
				});
			},
		);

		it.each(['message', 'time', 'revision', 'backwards-time', 'backwards-id'])(
			'rejects %s progress without changing stored state',
			async (change) => {
				await memory.commitObservationLogBatch(batch());
				const cursor = await memory.getCursor('thread-1');
				const input = batch(cursor);
				const rows = await memory.getObservationLog(input);
				if (change === 'message')
					input.expectedCursor = { ...cursor!, lastObservedMessageId: 'm1' };
				if (change === 'time') input.expectedCursor = { ...cursor!, lastObservedAt: new Date(0) };
				if (change === 'revision') input.expectedCursor = { ...cursor!, updatedAt: new Date(0) };
				if (change === 'backwards-time') input.nextCursor.lastObservedAt = new Date(1);
				if (change === 'backwards-id') input.nextCursor.lastObservedMessageId = 'm1';
				expect(await memory.commitObservationLogBatch(input)).toBe('stale');
				expect(await memory.getObservationLog(input)).toEqual(rows);
				expect(await memory.getCursor('thread-1')).toEqual(cursor);
			},
		);

		it('rebuilds an unchanged boundary once with a monotonic cursor revision', async () => {
			await memory.commitObservationLogBatch(batch());
			await observations.delete({ observationScopeId: 'thread-1' });
			const input = batch(await memory.getCursor('thread-1'));
			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			expect(await memory.getCursor('thread-1')).toEqual({
				...input.nextCursor,
				updatedAt: new Date(now.getTime() + 1),
			});
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await memory.getActiveObservationLog(input)).toHaveLength(2);
		});

		it.each([
			{ failure: 'observation', existing: false },
			{ failure: 'observation', existing: true },
			{ failure: 'observation-unique', existing: true },
			{ failure: 'cursor', existing: false },
			{ failure: 'cursor', existing: true },
		])(
			'rolls back a $failure failure with an existing cursor: $existing',
			async ({ failure, existing }) => {
				if (existing) await memory.commitObservationLogBatch(batch());
				const cursor = await memory.getCursor('thread-1');
				const input = batch(cursor);
				const rows = await memory.getObservationLog(input);
				if (failure === 'observation') input.entries[1].text = null as unknown as string;
				if (failure === 'cursor')
					input.nextCursor.lastObservedMessageId = null as unknown as string;
				const generateId = vi.spyOn(AgentObservationEntity.prototype, 'generateId');
				if (failure === 'observation-unique')
					generateId.mockImplementation(function (this: AgentObservationEntity) {
						this.id = 'batch-entry';
					});
				try {
					await expect(memory.commitObservationLogBatch(input)).rejects.toThrow();
				} finally {
					generateId.mockRestore();
				}
				expect(await memory.getObservationLog(input)).toEqual(rows);
				expect(await memory.getCursor('thread-1')).toEqual(cursor);
				input.entries[1].text = 'Done';
				input.nextCursor.lastObservedMessageId = 'm2';
				expect(await memory.commitObservationLogBatch(input)).toBe('committed');
				expect(await memory.commitObservationLogBatch(input)).toBe('stale');
				expect(await memory.getObservationLog(input)).toHaveLength(rows.length + 2);
			},
		);

		it('keeps guards and observations isolated by agent and scope', async () => {
			await memory.commitObservationLogBatch(batch());
			const cursor = await memory.getCursor('thread-1');
			expect(await otherMemory.commitObservationLogBatch(batch(cursor))).toBe('stale');
			expect(await otherMemory.getCursor('thread-1')).toBeNull();
			expect(await otherMemory.getObservationLog({ observationScopeId: 'thread-1' })).toEqual([]);
			expect(await otherMemory.commitObservationLogBatch(batch())).toBe('committed');
			expect(await memory.commitObservationLogBatch(batch(null, 'thread-2'))).toBe('committed');
			expect(await memory.getCursor('thread-1')).toEqual(cursor);
			expect(await memory.getObservationLog({ observationScopeId: 'thread-1' })).toHaveLength(2);
			expect(await otherMemory.getObservationLog({ observationScopeId: 'thread-1' })).toHaveLength(
				2,
			);
			expect(await memory.getObservationLog({ observationScopeId: 'thread-2' })).toHaveLength(2);
		});
	});

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
				episodic: scope.episodic,
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
			const sharedThread = (threadId: string, resourceId = 'integration:slack:U_ALICE') => ({
				resourceId,
				threadId,
				episodic: {
					writeScopeId: `thread:${threadId}`,
					readScopeIds: [resourceId, `thread:${threadId}`],
				},
			});
			const { entry: shared } = await captureEntry(memory, sharedThread('shared-1'));
			const { entry: otherThread } = await captureEntry(memory, sharedThread('shared-2'));
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
					sharedThread('shared-1', 'integration:slack:U_BOB'),
					[owned.contentHash],
				),
			).resolves.toEqual([expect.objectContaining({ id: shared.id, status: 'superseded' })]);
			await expect(
				memory.episodic.getEntriesByContentHashes(sharedThread('shared-2'), [owned.contentHash]),
			).resolves.toEqual([expect.objectContaining({ id: otherThread.id })]);
			await expect(
				memory.episodic.getEntriesByContentHashes(scope, ['missing-hash']),
			).resolves.toEqual([]);
			await expect(memory.episodic.getEntriesByContentHashes(scope, [])).resolves.toEqual([]);
		});

		it('isolates entries and pending candidates by the resolved scope instead of the thread', async () => {
			const inChannel = (channelId: string, threadId: string) => ({
				resourceId: 'integration:slack:U_ALICE',
				threadId,
				episodic: {
					writeScopeId: `slack:T1:channel:${channelId}`,
					readScopeIds: [`slack:T1:channel:${channelId}`],
				},
			});
			const first = inChannel('C1', 'thread-a');
			const second = inChannel('C1', 'thread-b');
			const other = inChannel('C2', 'thread-c');
			await captureEntry(memory, first, 'Channel one chose Postgres.', {
				episodic: first.episodic,
			});
			await captureEntry(memory, second, 'Channel one wants weekly reports.', {
				episodic: second.episodic,
			});
			await captureEntry(memory, other, 'Channel two chose MySQL.', { episodic: other.episodic });

			const recalled = async (scope: typeof first) =>
				(await memory.episodic.searchEntries(scope, 'Channel', { queryEmbedding: [1, 0] }))
					.map(({ content }) => content)
					.sort();

			await expect(recalled(first)).resolves.toEqual([
				'Channel one chose Postgres.',
				'Channel one wants weekly reports.',
			]);
			await expect(recalled(second)).resolves.toEqual(await recalled(first));
			await expect(recalled(other)).resolves.toEqual(['Channel two chose MySQL.']);
			await expect(memory.episodic.getPendingCaptureCandidates(first)).resolves.toHaveLength(2);
			await expect(memory.episodic.getPendingCaptureCandidates(other)).resolves.toHaveLength(1);
		});

		describe('Slack ownership', () => {
			function slackScope(
				overrides: Partial<EpisodicScopeContext> = {},
			): EpisodicMemoryScope & { episodic: ResolvedEpisodicScope } {
				const context: EpisodicScopeContext = {
					agentId,
					credentialId: 'cred-slack',
					integrationType: 'slack',
					threadId: crypto.randomUUID(),
					author: { id: 'U_ALICE', name: 'Alice' },
					origin: {
						type: 'slack',
						workspaceId: 'T1',
						conversationKind: 'channel',
						channelId: 'C1',
					},
					...overrides,
				};
				const episodic = Container.get(SlackIntegration).resolveEpisodicScope(context);
				if (!episodic) throw new Error('Expected Slack ownership');
				return {
					resourceId: integrationMemoryResourceId('slack', context.author.id),
					threadId: context.threadId,
					episodic,
				};
			}

			async function recall(scope: EpisodicMemoryScope, store = memory) {
				return (await store.episodic.searchEntries(scope, 'Slack', { queryEmbedding: [1, 0] }))
					.map(({ content }) => content)
					.sort();
			}

			it.each([
				{ channelId: 'C_PUBLIC', conversationKind: 'channel' as const },
				{ channelId: 'G_PRIVATE', conversationKind: 'channel' as const },
				{ channelId: 'G_GROUP', conversationKind: 'group' as const },
			])('shares only $channelId memories across authors and threads', async (conversation) => {
				const origin = { type: 'slack' as const, workspaceId: 'T1', ...conversation };
				const alice = slackScope({ origin });
				const bob = slackScope({ origin, author: { id: 'U_BOB', name: 'Bob' } });
				const newcomer = slackScope({ origin, author: { id: 'U_NEW', name: 'New member' } });
				const { entry, source } = await captureEntry(memory, alice, 'Slack chose Postgres.');
				await captureEntry(memory, bob, 'Slack wants weekly reports.');
				const personal = slackScope({
					origin: { ...origin, conversationKind: 'dm', channelId: 'D1' },
				});
				await captureEntry(memory, personal, 'Slack personal preference.');

				await expect(recall(newcomer)).resolves.toEqual([
					'Slack chose Postgres.',
					'Slack wants weekly reports.',
				]);
				await expect(recall(personal)).resolves.toEqual(['Slack personal preference.']);
				for (const conversationKind of ['channel', 'group', 'dm'] as const) {
					const other = slackScope({
						origin: { ...origin, conversationKind, channelId: 'OTHER' },
						author: { id: 'U_BOB', name: 'Bob' },
					});
					await expect(recall(other)).resolves.toEqual([]);
				}
				const candidates = await memory.episodic.getPendingCaptureCandidates(newcomer);
				expect(candidates).toHaveLength(2);
				expect(candidates).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							id: source.candidateId,
							threadId: alice.threadId,
							resourceId: alice.episodic.writeScopeId,
						}),
						expect.objectContaining({
							threadId: bob.threadId,
							resourceId: bob.episodic.writeScopeId,
						}),
					]),
				);
				await expect(memory.episodic.getEntrySources([entry.id])).resolves.toEqual([
					expect.objectContaining(source),
				]);
			});

			it('keeps personal DM ownership through credential and destination changes', async () => {
				const origin = {
					type: 'slack' as const,
					workspaceId: 'T1',
					conversationKind: 'dm' as const,
					channelId: 'D1',
				};
				await captureEntry(memory, slackScope({ origin }), 'Slack personal preference.');
				const replacement = slackScope({
					origin: { ...origin, channelId: 'D2' },
					credentialId: 'replacement-credential',
					author: { id: 'U_ALICE', name: 'Renamed Alice' },
				});
				await expect(recall(replacement)).resolves.toEqual(['Slack personal preference.']);
				await expect(
					recall(slackScope({ origin, author: { id: 'U_BOB', name: 'Bob' } })),
				).resolves.toEqual([]);
			});

			it('isolates the same channel by agent and receiving workspace', async () => {
				const origin = {
					type: 'slack' as const,
					workspaceId: 'T1',
					conversationKind: 'channel' as const,
					channelId: 'C1',
				};
				const first = slackScope({ origin });
				const workspace = slackScope({ origin: { ...origin, workspaceId: 'T2' } });
				const agent = slackScope({ origin, agentId: otherAgentId });
				await captureEntry(memory, first, 'Slack first workspace.');
				await captureEntry(memory, workspace, 'Slack second workspace.');
				await captureEntry(otherMemory, agent, 'Slack other agent.');

				await expect(recall(first)).resolves.toEqual(['Slack first workspace.']);
				await expect(recall(workspace)).resolves.toEqual(['Slack second workspace.']);
				await expect(recall(agent, otherMemory)).resolves.toEqual(['Slack other agent.']);
				await expect(recall(first, otherMemory)).resolves.toEqual([]);
				await expect(recall(agent)).resolves.toEqual([]);
			});

			it.each(['send_channel_message', 'send_dm'] as const)(
				'keeps capture and recall on the source after %s',
				async (action) => {
					const source = slackScope();
					const destination = slackScope({
						origin: {
							type: 'slack',
							workspaceId: 'T1',
							conversationKind: action === 'send_dm' ? 'dm' : 'channel',
							channelId: action === 'send_dm' ? 'D2' : 'C2',
						},
						author: { id: 'U_BOB', name: 'Bob' },
					});
					await captureEntry(memory, source, 'Slack source decision.');
					await captureEntry(memory, destination, 'Slack destination decision.');
					const context: IntegrationMessageContext = {
						integrationConnectionId: 'slack:cred-slack',
						platform: 'slack',
						target: { type: 'channel', channelId: 'slack:C1', threadId: 'slack:C1:1' },
						updatedAt: new Date().toISOString(),
					};
					const persistence = {
						resourceId: source.resourceId,
						threadId: source.threadId,
						hostMetadata: {
							...encodeEpisodicScopeMetadata(source.episodic),
							...encodeIntegrationMessageContext(context),
						},
					};
					const sentContext: IntegrationMessageContext = {
						...context,
						target:
							action === 'send_dm'
								? { type: 'dm', userId: 'U_BOB', threadId: 'slack:D2:' }
								: { type: 'channel', channelId: 'slack:C2', threadId: 'slack:C2:2' },
					};
					const actionExecutor = mock<IntegrationActionExecutor>();
					actionExecutor.execute.mockResolvedValue({ ok: true, messageContext: sentContext });
					const descriptor = getIntegrationToolConnectionDescriptors([
						{ type: 'slack', credentialId: 'cred-slack' },
					])[0];
					const tool = createIntegrationActionTool({
						descriptor,
						actionExecutor,
						messageContextStore: mock<IntegrationMessageContextStore>(),
					}).build();
					if (!tool.handler) throw new Error('Expected an action handler');
					await tool.handler(
						{
							action,
							input: { channelId: 'C2', userId: 'U_BOB', message: { text: 'Hello' } },
						},
						{ persistence },
					);

					expect(readIntegrationMessageContext(persistence)?.target).toEqual(sentContext.target);
					const scope = getEpisodicMemoryScope(persistence);
					if (!scope) throw new Error('Expected source memory scope');
					expect(scope).toEqual(source);
					await captureEntry(memory, scope, 'Slack captured after sending.');
					await expect(recall(scope)).resolves.toEqual([
						'Slack captured after sending.',
						'Slack source decision.',
					]);
					await expect(recall(destination)).resolves.toEqual(['Slack destination decision.']);
				},
			);
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

		describe('consolidation writes', () => {
			async function enqueueSource(content: string, toolCallId: string) {
				const candidate = await memory.episodic.enqueueCaptureCandidate({
					...scope,
					sourceMessageId: null,
					runId: crypto.randomUUID(),
					toolCallId,
					content,
					evidenceText: content,
					kind: 'fact',
				});
				const source: NewEpisodicMemoryEntrySourceForEntry = {
					candidateId: candidate.id,
					threadId: scope.threadId,
					evidenceText: content,
				};
				return { candidate, source };
			}

			const deleteCandidate = async (candidateId: string) =>
				await entryRepository.deleteCandidate(agentId, candidateId, {});

			it('finds the closest active entries of the write scope for each embedding', async () => {
				const { entry: near } = await captureEntry(memory, scope, 'Acme renewal is on 1 March.', {
					embedding: [1, 0],
				});
				const { entry: far } = await captureEntry(memory, scope, 'Acme uses Postgres.', {
					embedding: [0.6, 0.8],
				});
				const { entry: inactive } = await captureEntry(memory, scope, 'Acme renewal is late.', {
					embedding: [1, 0],
				});
				await entryRepository.update(inactive.id, { status: 'superseded' });
				await captureEntry(otherMemory, scope, 'Acme renewal is on 2 March.');
				const shared = {
					...scope,
					episodic: { writeScopeId: 'thread:thread-1', readScopeIds: [scope.resourceId] },
				};

				const similar = await memory.episodic.findSimilarEntries(
					scope,
					[
						[1, 0],
						[0, 1],
					],
					{
						topK: 3,
						minSimilarity: 0.5,
					},
				);

				expect(similar.map((entries) => entries.map(({ id }) => id))).toEqual([
					[near.id, far.id],
					[far.id],
				]);
				await expect(
					memory.episodic.findSimilarEntries(shared, [[1, 0]], { topK: 3, minSimilarity: 0.5 }),
				).resolves.toEqual([[]]);
			});

			it('adds sources to an active entry and refreshes it', async () => {
				const { entry } = await captureEntry(memory, scope);
				const { source } = await enqueueSource('Keep reports concise.', 'call-2');
				const lastSeenAt = new Date('2026-06-01T10:00:00.000Z');

				const refreshed = await memory.episodic.addEntrySources(entry.id, [source], lastSeenAt);

				expect(refreshed).toMatchObject({ id: entry.id, status: 'active', lastSeenAt });
				await expect(memory.episodic.getEntrySources([entry.id])).resolves.toEqual(
					expect.arrayContaining([expect.objectContaining({ candidateId: source.candidateId })]),
				);
				await expect(memory.episodic.getEntrySources([entry.id])).resolves.toHaveLength(2);
			});

			it('adds no source to an inactive entry or for a deleted candidate', async () => {
				const { entry } = await captureEntry(memory, scope);
				const deleted = await enqueueSource('Keep reports concise.', 'call-2');
				await deleteCandidate(deleted.candidate.id);

				await expect(
					memory.episodic.addEntrySources(entry.id, [deleted.source], new Date()),
				).resolves.toBeNull();

				const live = await enqueueSource('Keep every report concise.', 'call-3');
				await entryRepository.update(entry.id, { status: 'superseded' });
				await expect(
					memory.episodic.addEntrySources(entry.id, [live.source], new Date()),
				).resolves.toBeNull();
				await expect(memory.episodic.getEntrySources([entry.id])).resolves.toHaveLength(1);
			});

			it('merges entries with the sources of both the old entries and the new fact', async () => {
				const { entry: old, source: oldSource } = await captureEntry(
					memory,
					scope,
					'Acme renewal is on 1 March.',
				);
				const { source } = await enqueueSource('Acme renewal moved to 15 March.', 'call-2');

				const result = await memory.episodic.applyReflection(scope, {
					drop: [],
					merge: [
						{
							supersedes: [old.id],
							entry: {
								resourceId: scope.resourceId,
								content: 'Acme renewal is on 15 March.',
								embedding: [1, 0],
								embeddingModel: 'test-model',
							},
							sources: [source],
						},
					],
				});

				const [merged] = result.inserted;
				expect(result.supersededIds).toEqual([old.id]);
				expect(merged).toMatchObject({ content: 'Acme renewal is on 15 March.', status: 'active' });
				await expect(entryRepository.findOneByOrFail({ id: old.id })).resolves.toMatchObject({
					status: 'superseded',
					supersededBy: merged.id,
				});
				const sources = await memory.episodic.getEntrySources([merged.id]);
				expect(sources.map(({ candidateId }) => candidateId).sort()).toEqual(
					[oldSource.candidateId, source.candidateId].sort(),
				);
			});

			it('reuses a stored entry with the merged content as the replacement', async () => {
				const { entry: old } = await captureEntry(memory, scope, 'Acme renewal is on 1 March.');
				const { entry: existing } = await captureEntry(
					memory,
					scope,
					'Acme renewal is on 15 March.',
				);
				await entryRepository.update(existing.id, { status: 'dropped' });

				const result = await memory.episodic.applyReflection(scope, {
					drop: [],
					merge: [
						{
							supersedes: [old.id],
							entry: { resourceId: scope.resourceId, content: existing.content },
						},
					],
				});

				expect(result.inserted).toEqual([
					expect.objectContaining({ id: existing.id, status: 'active' }),
				]);
				await expect(memory.episodic.getEntrySources([existing.id])).resolves.toHaveLength(2);
			});

			it('skips a merge when a user deleted the candidate of its sources', async () => {
				const { entry: old } = await captureEntry(memory, scope, 'Acme renewal is on 1 March.');
				const { candidate, source } = await enqueueSource(
					'Acme renewal moved to 15 March.',
					'call-2',
				);
				await deleteCandidate(candidate.id);

				const result = await memory.episodic.applyReflection(scope, {
					drop: [],
					merge: [
						{
							supersedes: [old.id],
							entry: { resourceId: scope.resourceId, content: 'Acme renewal is on 15 March.' },
							sources: [source],
						},
					],
				});

				expect(result).toEqual({ droppedIds: [], supersededIds: [], inserted: [] });
				await expect(entryRepository.findBy({ status: 'active' })).resolves.toEqual([
					expect.objectContaining({ id: old.id }),
				]);
			});
		});

		describe('capture deletion', () => {
			async function enqueue(content = 'User prefers concise reports.', toolCallId = 'call-1') {
				await memory.saveThread({ id: scope.threadId, resourceId: scope.resourceId });
				const candidate = await memory.episodic.enqueueCaptureCandidate({
					...scope,
					sourceMessageId: null,
					runId: crypto.randomUUID(),
					toolCallId,
					content,
					evidenceText: content,
					kind: 'preference',
				});
				const save = async () =>
					await memory.episodic.saveEntryWithSources({ resourceId: scope.resourceId, content }, [
						{ candidateId: candidate.id, threadId: scope.threadId, evidenceText: content },
					]);
				return { candidate, save };
			}

			const deleteCandidate = async (candidateId: string) =>
				await entryRepository.deleteCandidate(agentId, candidateId, {});

			const activeEntries = async () => await entryRepository.findBy({ status: 'active' });

			it('stores nothing when the capture saves a candidate deleted after it was read', async () => {
				const { candidate, save } = await enqueue();

				await expect(deleteCandidate(candidate.id)).resolves.toBe(true);

				await expect(save()).resolves.toBeNull();
				expect(await entryRepository.count()).toBe(0);
				await expect(memory.episodic.getPendingCaptureCandidates(scope)).resolves.toEqual([]);
			});

			it('deletes the stored entry when a completed candidate is deleted', async () => {
				const { candidate } = await enqueue();
				const entry = await memory.episodic.saveEntryWithSources(
					{
						resourceId: scope.resourceId,
						content: candidate.content,
						embedding: [1, 0],
						embeddingModel: 'test-model',
					},
					[
						{
							candidateId: candidate.id,
							threadId: scope.threadId,
							evidenceText: candidate.content,
						},
					],
				);
				const search = async () =>
					await memory.episodic.searchEntries(scope, 'concise', { queryEmbedding: [1, 0] });
				expect((await search()).map(({ id }) => id)).toEqual([entry!.id]);

				await expect(deleteCandidate(candidate.id)).resolves.toBe(true);

				await expect(entryRepository.findOneByOrFail({ id: entry!.id })).resolves.toMatchObject({
					status: 'deleted',
				});
				await expect(search()).resolves.toEqual([]);
				await expect(deleteCandidate(candidate.id)).resolves.toBe(false);
			});

			it('stores a user delete as deleted', async () => {
				const { entry } = await captureEntry(memory, scope);

				await expect(entryRepository.markDeleted(agentId, entry.id)).resolves.toBe(true);

				await expect(entryRepository.findOneByOrFail({ id: entry.id })).resolves.toMatchObject({
					status: 'deleted',
				});
			});

			it('keeps an entry that another candidate still supports', async () => {
				const first = await enqueue();
				const second = await enqueue(undefined, 'call-2');
				const entry = await first.save();
				await second.save();

				await deleteCandidate(first.candidate.id);

				await expect(activeEntries()).resolves.toEqual([
					expect.objectContaining({ id: entry!.id }),
				]);
				await expect(memory.episodic.getEntrySources([entry!.id])).resolves.toEqual([
					expect.objectContaining({ candidateId: second.candidate.id }),
				]);
			});

			it('leaves no active entry when delete and capture run at the same time', async () => {
				for (let attempt = 0; attempt < 5; attempt++) {
					await entryRepository.delete({});
					const { candidate, save } = await enqueue(`Fact ${attempt}`, `call-${attempt}`);

					await Promise.all([save(), deleteCandidate(candidate.id)]);

					await expect(activeEntries()).resolves.toEqual([]);
				}
			});
		});
	});
});
