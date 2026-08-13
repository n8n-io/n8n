import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentRepository integration columns', () => {
	let agentRepo: AgentRepository;
	let agentHistoryRepo: AgentHistoryRepository;
	let projectId: string;

	async function createAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'version-1',
			activeVersionId: null,
			...overrides,
		} as Partial<Agent>);
		return await agentRepo.save(agent);
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
