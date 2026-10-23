/**
 * Create takes a client-minted agent id, so the id in the request may name a
 * row that already exists. The unit tests mock the repository, so they can only
 * prove the service handles a rejected write — not that the write is rejected.
 * That needs a real primary key, which is what these cover.
 */

import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';

import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { NodeToolAiGatewayService } from '@/modules/agents/json-config/node-tool-ai-gateway.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { Telemetry } from '@/telemetry';

import { createOwner } from '../shared/db/users';

// Nothing here is policed, so the actor only has to be well formed.
const actor = { kind: 'user', user: { id: 'user-1' } } as const;

describe('AgentsService.create — client-minted id', () => {
	let agentsService: AgentsService;
	let agentRepo: AgentRepository;
	const telemetry = mockInstance(Telemetry);
	mockInstance(AgentUpdateBroadcaster);
	mockInstance(NodeToolAiGatewayService);

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		await Container.get(AgentsSettingsService).setEnabled(true);
		agentsService = Container.get(AgentsService);
		agentRepo = Container.get(AgentRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns a fully populated entity on a plain create', async () => {
		const project = await createTeamProject();
		const agent = await agentsService.create(project.id, 'Fresh Agent', { actor });

		expect(agent.id).toEqual(expect.any(String));
		expect(agent.createdAt).toBeInstanceOf(Date);
		expect(agent.updatedAt).toBeInstanceOf(Date);
		expect(await agentRepo.findOneByOrFail({ id: agent.id })).toMatchObject({
			name: 'Fresh Agent',
			projectId: project.id,
		});
	});

	it('drops other agents task references when creating with a server-assigned id', async () => {
		const project = await createTeamProject();
		const user = await createOwner();
		const source = await agentsService.create(project.id, 'Source Agent', { actor });
		const taskRepository = Container.get(AgentTaskRepository);
		const task = await taskRepository.save(
			taskRepository.create({
				id: `task_${nanoid(16)}`,
				agentId: source.id,
				name: 'Daily summary',
				objective: 'Summarize the daily activity',
				cronExpression: '0 9 * * *',
				timezone: null,
			}),
		);

		const { agent, config } = await agentsService.createOrAdopt(project.id, 'New Agent', {
			actor: { kind: 'user', user },
			user,
			config: { tasks: [{ type: 'task', id: task.id, enabled: true }] },
		});

		expect(config?.tasks).toEqual([]);
		expect((await agentRepo.findById(agent.id))?.schema?.tasks).toEqual([]);
	});

	it.each(['create', 'createOrAdopt'] as const)(
		'blocks %s when Agents is disabled',
		async (method) => {
			const settings = Container.get(AgentsSettingsService);
			await settings.setEnabled(false);
			try {
				const project = await createTeamProject();
				await expect(
					agentsService[method](project.id, 'Disabled Agent', { actor }),
				).rejects.toThrow('Agents are disabled');
			} finally {
				await settings.setEnabled(true);
			}
		},
	);

	it('rejects an id that names a row in the same project', async () => {
		const project = await createTeamProject();
		const first = await agentsService.create(project.id, 'First', { actor });

		await expect(
			agentsService.create(project.id, 'Second', { actor, id: first.id }),
		).rejects.toThrow(ConflictError);
	});

	it('adopts a same-project row when the caller may adopt it', async () => {
		const project = await createTeamProject();
		const first = await agentsService.create(project.id, 'First', { actor });

		const { agent, adopted } = await agentsService.createOrAdopt(project.id, 'Second', {
			actor,
			id: first.id,
			adoptOnCollision: true,
		});

		expect(adopted).toBe(true);
		expect(agent.name).toBe('First');
	});

	it('keeps the winning configuration and reports one creation when editor and builder race', async () => {
		const project = await createTeamProject();
		const user = await createOwner();
		const id = nanoid(16);
		const track = telemetry.track.mockClear();
		const sources = ['user', 'builder'] as const;
		const results = await Promise.all(
			sources.map(
				async (createdBy) =>
					await agentsService.createOrAdopt(project.id, createdBy, {
						id,
						user,
						actor: { kind: 'user', user },
						createdBy,
						adoptOnCollision: true,
						config: { instructions: `${createdBy} configuration` },
					}),
			),
		);

		expect(results.filter(({ adopted }) => !adopted)).toHaveLength(1);
		const winner = results.find(({ adopted }) => !adopted)!;
		expect(results.map(({ config }) => config)).toEqual([winner.config, winner.config]);
		expect(await agentRepo.findById(id)).toMatchObject({
			name: winner.agent.name,
			schema: { instructions: winner.config?.instructions },
		});
		const event =
			winner.agent.name === 'user'
				? TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT
				: TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT;
		expect(track).toHaveBeenCalledExactlyOnceWith(
			event,
			expect.objectContaining({ agent_id: id, event_version: '3' }),
		);
	});

	it('leaves an agent in its own project when another project reuses its id', async () => {
		const ownerProject = await createTeamProject();
		const otherProject = await createTeamProject();
		const agent = await agentsService.create(ownerProject.id, 'Owned Agent', { actor });

		await expect(
			agentsService.create(otherProject.id, 'Renamed Agent', { actor, id: agent.id }),
		).rejects.toThrow(ConflictError);

		const stored = await agentRepo.findOneByOrFail({ id: agent.id });
		expect(stored.projectId).toBe(ownerProject.id);
		expect(stored.name).toBe('Owned Agent');
	});

	// Adoption must not become a read oracle for ids in projects the caller
	// cannot see: the same conflict either way.
	it('rejects a cross-project id the same way when adoption is allowed', async () => {
		const ownerProject = await createTeamProject();
		const otherProject = await createTeamProject();
		const agent = await agentsService.create(ownerProject.id, 'Owned Agent', { actor });

		await expect(
			agentsService.create(otherProject.id, 'Renamed Agent', {
				actor,
				id: agent.id,
				adoptOnCollision: true,
			}),
		).rejects.toThrow(ConflictError);
	});
});
