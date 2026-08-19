import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentRepository', () => {
	let agentRepo: AgentRepository;
	let agentHistoryRepo: AgentHistoryRepository;
	let projectId: string;

	async function createAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			schema: { name: 'Test Agent', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'version-1',
			activeVersionId: null,
			...overrides,
		} as Partial<Agent>);
		return await agentRepo.save(agent);
	}

	async function createHistory(agentId: string, versionId: string) {
		await agentHistoryRepo.insert({
			versionId,
			agentId,
			author: 'test',
			schema: null,
			tools: null,
			skills: null,
		});
	}

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		agentHistoryRepo = Container.get(AgentHistoryRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;
	});

	afterEach(async () => {
		await agentHistoryRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

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

	describe('findIntegrationState', () => {
		it('reads the columns an integration mutation needs', async () => {
			const agent = await createAgent({
				integrations: [{ type: 'slack', credentialId: 'slack-1' }],
				versionId: 'version-1',
				activeVersionId: null,
			});

			await expect(agentRepo.findIntegrationState(agent.id)).resolves.toEqual({
				integrations: [{ type: 'slack', credentialId: 'slack-1' }],
				versionId: 'version-1',
				activeVersionId: null,
			});
		});

		it('returns null for an agent that no longer exists', async () => {
			await expect(agentRepo.findIntegrationState(uuid())).resolves.toBeNull();
		});
	});

	describe('updateIntegrations', () => {
		it('writes the integration columns and leaves everything else alone', async () => {
			const agent = await createAgent({
				name: 'Original name',
				schema: { name: 'Original name', model: 'anthropic/claude-sonnet-4-5', instructions: 'Hi' },
				versionId: 'version-1',
			});

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			expect(written).toBe(true);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
			expect(reloaded?.versionId).toBe('version-2');
			expect(reloaded?.name).toBe('Original name');
			expect(reloaded?.schema).toEqual(agent.schema);
		});

		it('refuses the write when a publication landed after the read', async () => {
			const agent = await createAgent({ versionId: 'version-1', activeVersionId: null });
			// A concurrent publish claims the current draft as the live version.
			await agentHistoryRepo.saveVersion({
				versionId: 'version-1',
				agentId: agent.id,
				schema: agent.schema,
				tools: null,
				skills: null,
				publishedBy: 'Someone Else',
			});
			await agentRepo.update({ id: agent.id }, { activeVersionId: 'version-1' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			// The publish is untouched and the caller is told to re-read, so it cannot
			// act on stale publication state.
			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.activeVersionId).toBe('version-1');
			expect(reloaded?.integrations).toEqual([]);

			// Reapplied against the state that is actually there, it lands.
			await expect(
				agentRepo.updateIntegrations(
					agent.id,
					[{ type: 'slack', credentialId: 'slack-1' }],
					{ versionId: 'version-1', activeVersionId: 'version-1' },
					'version-2',
				),
			).resolves.toBe(true);
			expect((await agentRepo.findById(agent.id))?.activeVersionId).toBe('version-1');
		});

		it('refuses the write when another writer moved the version on', async () => {
			const agent = await createAgent({ versionId: 'version-1' });
			await agentRepo.update({ id: agent.id }, { versionId: 'version-9' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);

			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([]);
			expect(reloaded?.versionId).toBe('version-9');
		});

		it('matches a null version, so a never-published draft can still be updated', async () => {
			const agent = await createAgent({ versionId: null });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: null, activeVersionId: null },
				null,
			);

			expect(written).toBe(true);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
			expect(reloaded?.versionId).toBeNull();
		});

		it('refuses the write when a null version was set in the meantime', async () => {
			const agent = await createAgent({ versionId: 'version-1' });

			const written = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: null, activeVersionId: null },
				null,
			);

			expect(written).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([]);
			expect(reloaded?.versionId).toBe('version-1');
		});

		it('serialises two writers that read the same version', async () => {
			const agent = await createAgent({ versionId: 'version-1' });

			// Both read version-1 and both project onto the empty array they saw.
			const first = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'slack', credentialId: 'slack-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-2',
			);
			const second = await agentRepo.updateIntegrations(
				agent.id,
				[{ type: 'linear', credentialId: 'linear-1' }],
				{ versionId: 'version-1', activeVersionId: null },
				'version-3',
			);

			expect(first).toBe(true);
			// The loser is told, so it can re-read and reapply instead of clobbering.
			expect(second).toBe(false);
			const reloaded = await agentRepo.findById(agent.id);
			expect(reloaded?.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
		});

		it('reports no write for an agent that no longer exists', async () => {
			await expect(
				agentRepo.updateIntegrations(
					uuid(),
					[],
					{ versionId: 'version-1', activeVersionId: null },
					'version-2',
				),
			).resolves.toBe(false);
		});
	});
});
