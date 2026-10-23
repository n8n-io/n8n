import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { AgentMessageAuthor, AgentMessageIntegrationOrigin } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentMemoryEntryCandidateEntity } from '@/modules/agents/entities/agent-memory-entry-candidate.entity';
import { AgentMemoryEntrySourceEntity } from '@/modules/agents/entities/agent-memory-entry-source.entity';
import { AgentMessageEntity } from '@/modules/agents/entities/agent-message.entity';
import { AgentThreadEntity } from '@/modules/agents/entities/agent-thread.entity';
import { AgentMemoryEntryRepository } from '@/modules/agents/repositories/agent-memory-entry.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentResourceRepository } from '@/modules/agents/repositories/agent-resource.repository';

describe('AgentMemoryEntryRepository list and delete', () => {
	let entryRepository: AgentMemoryEntryRepository;
	let agentRepository: AgentRepository;
	let resourceRepository: AgentResourceRepository;
	let agentId: string;
	let resourceId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		entryRepository = Container.get(AgentMemoryEntryRepository);
		agentRepository = Container.get(AgentRepository);
		resourceRepository = Container.get(AgentResourceRepository);
	}, 30_000);

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
		resourceId = uuid();
		await resourceRepository.insert({ id: resourceId, metadata: null });
	});

	afterEach(async () => {
		const { manager } = Container.get(DataSource);
		await manager.delete(AgentMemoryEntrySourceEntity, {});
		await manager.delete(AgentMemoryEntryCandidateEntity, {});
		await manager.delete(AgentMessageEntity, {});
		await manager.delete(AgentThreadEntity, {});
		await entryRepository.delete({});
		await resourceRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertEntry(content: string, createdAt: string, status = 'active') {
		const id = uuid();
		await entryRepository.insert({
			id,
			agentId,
			resourceId,
			content,
			contentHash: content,
			status: status as 'active',
			lastSeenAt: new Date(createdAt),
			createdAt: new Date(createdAt),
		});
		return id;
	}

	it('lists active entries newest first and pages with a cursor', async () => {
		const oldest = await insertEntry('a', '2026-10-01T10:00:00.000Z');
		const middle = await insertEntry('b', '2026-10-02T10:00:00.000Z');
		const newest = await insertEntry('c', '2026-10-03T10:00:00.000Z');
		await insertEntry('hidden', '2026-10-04T10:00:00.000Z', 'dropped');

		const firstPage = await entryRepository.listActiveByAgent(agentId, 2);
		expect(firstPage.map(({ id }) => id)).toEqual([newest, middle]);

		const secondPage = await entryRepository.listActiveByAgent(agentId, 2, {
			createdAt: firstPage[1].createdAt,
			id: firstPage[1].id,
		});
		expect(secondPage.map(({ id }) => id)).toEqual([oldest]);
		await expect(entryRepository.countActiveByAgent(agentId)).resolves.toBe(3);
	});

	it('deletes an entry by dropping it and hides it from the list and the count', async () => {
		const id = await insertEntry('a', '2026-10-01T10:00:00.000Z');

		await expect(entryRepository.markDeleted(agentId, id)).resolves.toBe(true);

		await expect(entryRepository.listActiveByAgent(agentId, 10)).resolves.toEqual([]);
		await expect(entryRepository.countActiveByAgent(agentId)).resolves.toBe(0);
		expect(await entryRepository.findOneByOrFail({ id })).toMatchObject({
			status: 'dropped',
			content: 'a',
		});
	});

	it('does not delete an entry twice or an entry of another agent', async () => {
		const id = await insertEntry('a', '2026-10-01T10:00:00.000Z');

		await expect(entryRepository.markDeleted(uuid(), id)).resolves.toBe(false);
		await expect(entryRepository.markDeleted(agentId, id)).resolves.toBe(true);
		await expect(entryRepository.markDeleted(agentId, id)).resolves.toBe(false);
	});

	it('stores a deleted fact again when it is captured later', async () => {
		const id = await insertEntry('same fact', '2026-10-01T10:00:00.000Z');
		await entryRepository.markDeleted(agentId, id);

		await entryRepository.saveEntryWithSources(
			agentId,
			{ resourceId, content: 'same fact', contentHash: 'same fact' } as never,
			[],
			{},
		);

		expect(await entryRepository.findOneByOrFail({ id })).toMatchObject({ status: 'active' });
		await expect(entryRepository.countActiveByAgent(agentId)).resolves.toBe(1);
	});

	describe('source filters and facets', () => {
		const slackOrigin = (
			channelId: string,
			channelName: string,
		): AgentMessageIntegrationOrigin => ({
			type: 'slack',
			workspaceId: 'W1',
			conversationKind: 'channel',
			channelId,
			channelName,
		});

		/** Stores an entry whose only source is one message with this author and origin. */
		async function insertSourcedEntry(opts: {
			scope: string;
			content: string;
			author?: AgentMessageAuthor;
			integration?: AgentMessageIntegrationOrigin;
		}) {
			const { manager } = Container.get(DataSource);
			await resourceRepository.upsert({ id: opts.scope, metadata: null }, ['id']);
			const threadId = uuid();
			await manager.insert(AgentThreadEntity, { id: threadId, resourceId: opts.scope });
			const messageId = uuid();
			await manager.insert(AgentMessageEntity, {
				id: messageId,
				threadId,
				resourceId: opts.scope,
				role: 'user',
				content: { role: 'user', content: [] } as never,
				author: opts.author ?? null,
				origin: opts.integration
					? { source: opts.integration.type, integration: opts.integration }
					: null,
			});
			const candidateId = uuid();
			await manager.insert(AgentMemoryEntryCandidateEntity, {
				id: candidateId,
				agentId,
				resourceId: opts.scope,
				threadId,
				sourceMessageId: messageId,
				runId: uuid(),
				toolCallId: uuid(),
				content: opts.content,
				evidenceText: opts.content,
				kind: 'preference',
				status: 'completed',
			});
			const entryId = uuid();
			await entryRepository.insert({
				id: entryId,
				agentId,
				resourceId: opts.scope,
				content: opts.content,
				contentHash: opts.content,
				status: 'active',
				lastSeenAt: new Date(),
			});
			await manager.insert(AgentMemoryEntrySourceEntity, {
				id: uuid(),
				agentId,
				memoryEntryId: entryId,
				candidateId,
				threadId,
				evidenceHash: opts.content,
				evidenceText: opts.content,
			});
			return entryId;
		}

		let finance: string;
		let support: string;
		let linear: string;
		let preview: string;
		let chat: string;
		let legacy: string;
		let crossed: string;

		beforeEach(async () => {
			finance = await insertSourcedEntry({
				scope: 'integration:slack:U1',
				content: 'finance fact',
				author: { id: 'U1', name: 'Sin' },
				integration: slackOrigin('C1', 'finance-ops'),
			});
			// The channel scope that `SlackIntegration.resolveEpisodicScope` writes.
			support = await insertSourcedEntry({
				scope: 'slack:agent-1:W1:channel:C2',
				content: 'support fact',
				author: { id: 'U2', name: 'Marco' },
				integration: slackOrigin('C2', 'support'),
			});
			linear = await insertSourcedEntry({
				scope: 'linear:agent-1:credential-1:T1',
				content: 'linear fact',
				author: { id: 'L1', name: 'Priya' },
				integration: { type: 'linear', issueId: 'I1', teamId: 'T1', teamName: 'Platform' },
			});
			preview = await insertSourcedEntry({ scope: 'draft-chat:user-1', content: 'preview fact' });
			chat = await insertSourcedEntry({
				scope: 'n8n-chat-production:user-1',
				content: 'chat fact',
			});
			// Stored before messages kept their author and origin.
			legacy = await insertSourcedEntry({ scope: 'integration:slack:U3', content: 'legacy fact' });
			// The message decides over the scope id.
			crossed = await insertSourcedEntry({
				scope: 'integration:slack:U4',
				content: 'crossed fact',
				author: { id: 'L2', name: 'Kim' },
				integration: { type: 'linear', issueId: 'I2', teamId: 'T2' },
			});
		});

		it.each([
			[
				'an integration',
				() => ({
					integration: { type: 'slack', resourceIdPrefixes: ['integration:slack:', 'slack:'] },
				}),
				() => [finance, support, legacy],
			],
			[
				'an integration named only by a source message',
				() => ({
					integration: { type: 'linear', resourceIdPrefixes: ['integration:linear:', 'linear:'] },
				}),
				() => [linear, crossed],
			],
			[
				'a channel',
				() => ({
					sourceMessage: { integrationType: 'slack', field: 'channelId' as const, value: 'C2' },
				}),
				() => [support],
			],
			[
				'a team',
				() => ({
					sourceMessage: { integrationType: 'linear', field: 'teamId' as const, value: 'T1' },
				}),
				() => [linear],
			],
			[
				'an author',
				() => ({
					sourceMessage: { integrationType: 'slack', field: 'authorId' as const, value: 'U1' },
				}),
				() => [finance],
			],
			[
				'an author of another integration',
				() => ({
					sourceMessage: { integrationType: 'discord', field: 'authorId' as const, value: 'U1' },
				}),
				() => [],
			],
			[
				'a chat user in Preview and n8n Chat',
				() => ({ resourceIds: ['draft-chat:user-1', 'n8n-chat-production:user-1'] }),
				() => [preview, chat],
			],
			[
				'all chat users',
				() => ({ resourceIdPrefixes: ['draft-chat:', 'n8n-chat-production:'] }),
				() => [preview, chat],
			],
		])('filters by %s', async (_name, filter, expected) => {
			const listed = await entryRepository.listActiveByAgent(agentId, 10, undefined, filter());

			expect(listed.map(({ id }) => id).sort()).toEqual(expected().sort());
			await expect(entryRepository.countActiveByAgent(agentId, filter())).resolves.toBe(
				expected().length,
			);
		});

		it('lists the source context of active entries', async () => {
			await entryRepository.markDeleted(agentId, support);

			const rows = await entryRepository.findSourceFacetRows(agentId);

			expect(rows).toHaveLength(6);
			expect(rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						resourceId: 'integration:slack:U1',
						integrationType: 'slack',
						channelId: 'C1',
						channelName: 'finance-ops',
						authorId: 'U1',
						authorName: 'Sin',
					}),
					expect.objectContaining({
						resourceId: 'linear:agent-1:credential-1:T1',
						teamId: 'T1',
						teamName: 'Platform',
					}),
					expect.objectContaining({ resourceId: 'draft-chat:user-1', authorId: null }),
					expect.objectContaining({ resourceId: 'integration:slack:U3', integrationType: null }),
				]),
			);
		});
	});
});
