import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { ProjectRepository, ServiceAccountDetails, ServiceAccountRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { nanoid } from 'nanoid';

import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { NodeToolAiGatewayService } from '@/modules/agents/json-config/node-tool-ai-gateway.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { ServiceAccountService } from '@/services/service-account.service';
import { Telemetry } from '@/telemetry';

import { createOwner } from '../shared/db/users';

const actor = { kind: 'user', user: { id: 'user-1' } } as const;

describe('Agent service accounts', () => {
	let agentsService: AgentsService;
	let agentRepo: AgentRepository;
	let agentsConfig: AgentsConfig;
	mockInstance(Telemetry);
	mockInstance(AgentUpdateBroadcaster);
	mockInstance(NodeToolAiGatewayService);

	const countServiceAccounts = async () =>
		await Container.get(DataSource).manager.count(ServiceAccountDetails);

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		await Container.get(AgentsSettingsService).setEnabled(true);
		agentsService = Container.get(AgentsService);
		agentRepo = Container.get(AgentRepository);
		agentsConfig = Container.get(AgentsConfig);
	});

	beforeEach(() => {
		agentsConfig.serviceAccountsEnabled = true;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		agentsConfig.serviceAccountsEnabled = false;
		await testDb.terminate();
	});

	const expectServiceAccountWithPersonalProject = async (agentId: string, name: string) => {
		const { serviceAccountId } = await agentRepo.findOneByOrFail({ id: agentId });
		expect(serviceAccountId).toEqual(expect.any(String));
		const serviceAccount = await Container.get(ServiceAccountRepository).findById(
			serviceAccountId!,
		);
		expect(serviceAccount?.details.name).toBe(name);
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			serviceAccountId!,
		);
		expect(personalProject).toMatchObject({ type: 'personal', creatorId: serviceAccountId });
	};

	it('gives a new agent a service account with a personal project', async () => {
		const project = await createTeamProject();

		const agent = await agentsService.create(project.id, 'Support Agent', { actor });

		await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
	});

	it('gives an agent created from a complete definition a service account', async () => {
		const project = await createTeamProject();
		const owner = await createOwner();

		const agent = await agentsService.create(project.id, 'Imported Agent', {
			id: nanoid(),
			definition: { name: 'Imported Agent', tools: {}, config: null, tasks: new Map() },
			user: owner,
			actor: { kind: 'user', user: owner },
		});

		await expectServiceAccountWithPersonalProject(agent.id, 'Imported Agent');
	});

	it('does not save the agent when the service account cannot be created', async () => {
		const project = await createTeamProject();
		const id = nanoid();
		vi.spyOn(Container.get(ServiceAccountService), 'create').mockRejectedValueOnce(
			new Error('account creation failed'),
		);

		await expect(agentsService.create(project.id, 'Agent', { actor, id })).rejects.toThrow(
			'account creation failed',
		);

		expect(await agentRepo.findOneBy({ id })).toBeNull();
	});

	it('keeps no service account when the agent insert fails', async () => {
		const project = await createTeamProject();
		const existing = await agentsService.create(project.id, 'First', { actor });
		const before = await countServiceAccounts();

		await expect(
			agentsService.create(project.id, 'Second', { actor, id: existing.id }),
		).rejects.toThrow(ConflictError);

		expect(await countServiceAccounts()).toBe(before);
	});

	it('rejects a second agent with the same service account', async () => {
		const project = await createTeamProject();
		const first = await agentsService.create(project.id, 'First', { actor });
		const second = await agentsService.create(project.id, 'Second', { actor });
		const { serviceAccountId } = await agentRepo.findOneByOrFail({ id: first.id });

		await expect(agentRepo.update({ id: second.id }, { serviceAccountId })).rejects.toThrow();
	});

	it('creates no service account when agent service accounts are off', async () => {
		agentsConfig.serviceAccountsEnabled = false;
		const project = await createTeamProject();
		const before = await countServiceAccounts();

		const agent = await agentsService.create(project.id, 'Agent', { actor });

		expect((await agentRepo.findOneByOrFail({ id: agent.id })).serviceAccountId).toBeNull();
		expect(await countServiceAccounts()).toBe(before);
	});
});
