import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
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
});
