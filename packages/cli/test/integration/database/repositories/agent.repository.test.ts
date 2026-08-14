import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentRepository revision fence', () => {
	let agentRepo: AgentRepository;
	let historyRepo: AgentHistoryRepository;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		historyRepo = Container.get(AgentHistoryRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;
	});

	afterEach(async () => {
		await agentRepo.delete({});
		await historyRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createAgent = async (overrides: Partial<Agent> = {}) => {
		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			schema: { name: 'Test Agent', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: uuid(),
			...overrides,
		} as Partial<Agent>);
		await agentRepo.save(agent);
		return agent;
	};

	const createHistory = async (agentId: string, versionId: string) => {
		await historyRepo.insert({
			versionId,
			agentId,
			author: 'test',
			schema: null,
			tools: null,
			skills: null,
		});
	};

	describe('saveDraftFenced', () => {
		it('persists draft columns and bumps revision when the fence is won', async () => {
			const agent = await createAgent();

			agent.name = 'Renamed Agent';
			agent.schema = { name: 'Renamed Agent', model: 'm2', instructions: 'i2' };
			const won = await agentRepo.saveDraftFenced(agent);

			expect(won).toBe(true);
			expect(agent.revision).toBe(1);

			const row = await agentRepo.findById(agent.id);
			expect(row?.name).toBe('Renamed Agent');
			expect(row?.schema?.model).toBe('m2');
			expect(row?.revision).toBe(1);
		});

		it('cannot roll back a publish that won between load and save', async () => {
			const agent = await createAgent();
			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);

			// The stale writer loads the row first.
			const stale = await agentRepo.findById(agent.id);
			expect(stale).not.toBeNull();

			// A concurrent publish wins the fence: sets the active pointer and
			// bumps revision.
			const publishWon = await agentRepo.setActiveVersionFenced(agent.id, agent.revision, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});
			expect(publishWon).toBe(true);

			// The stale draft save must lose instead of writing its
			// pre-publish column values over the row.
			stale!.schema = { name: 'Stale Edit', model: 'm', instructions: 'i' };
			const draftWon = await agentRepo.saveDraftFenced(stale!);

			expect(draftWon).toBe(false);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBe(publishedVersionId);
			expect(row?.versionId).toBe(publishedVersionId);
			expect(row?.schema?.name).toBe('Test Agent');
		});

		it('never writes the active version pointer, even when it wins', async () => {
			const agent = await createAgent();
			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);
			await agentRepo.setActiveVersionFenced(agent.id, agent.revision, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});

			// Fresh load sees the published state; a draft edit on top of it
			// must start a new draft without touching the active pointer.
			const fresh = await agentRepo.findById(agent.id);
			fresh!.schema = { name: 'Draft Edit', model: 'm', instructions: 'i' };
			fresh!.versionId = uuid();
			const won = await agentRepo.saveDraftFenced(fresh!);

			expect(won).toBe(true);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBe(publishedVersionId);
			expect(row?.versionId).toBe(fresh!.versionId);
			expect(row?.schema?.name).toBe('Draft Edit');
		});

		it('lets a publish lose to a draft edit that won in between', async () => {
			const agent = await createAgent();
			const expectedAtLoad = agent.revision;

			agent.schema = { name: 'Concurrent Edit', model: 'm', instructions: 'i' };
			await agentRepo.saveDraftFenced(agent);

			const publishedVersionId = uuid();
			await createHistory(agent.id, publishedVersionId);
			const publishWon = await agentRepo.setActiveVersionFenced(agent.id, expectedAtLoad, {
				activeVersionId: publishedVersionId,
				versionId: publishedVersionId,
			});

			expect(publishWon).toBe(false);
			const row = await agentRepo.findById(agent.id);
			expect(row?.activeVersionId).toBeNull();
			expect(row?.schema?.name).toBe('Concurrent Edit');
		});
	});
});
