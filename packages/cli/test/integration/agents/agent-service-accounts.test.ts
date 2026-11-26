import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import {
	Project,
	ProjectRepository,
	ServiceAccountDetails,
	ServiceAccountRepository,
	SharedCredentials,
	SharedWorkflow,
	User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { SecurityContext } from '@n8n/permissions';
import { BadRequestError, ConflictError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { nanoid } from 'nanoid';
import { mock } from 'vitest-mock-extended';

import { ensureInstanceAgent } from '@test-integration/db/agents';

import { AgentApprovalCleanupService } from '@/modules/agents/approval/agent-approval-cleanup.service';
import { AgentServiceAccountService } from '@/modules/agents/agent-service-account.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { registerServiceAccountUsage } from '@/modules/agents/register-service-account-usage';
import { registerUserDeletionHandler } from '@/modules/agents/register-user-deletion-handler';
import { NodeToolAiGatewayService } from '@/modules/agents/json-config/node-tool-ai-gateway.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import { ProjectService } from '@/services/project.service.ee';
import { ServiceAccountProjects } from '@/services/service-account-projects';
import { ServiceAccountService } from '@/services/service-account.service';
import { UserService } from '@/services/user.service';
import { Telemetry } from '@/telemetry';

import { createCredentials, shareCredentialWithProjects } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

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
		registerUserDeletionHandler();
		registerServiceAccountUsage();
		// The module registers this in `init`, which tests do not run.
		Container.get(ServiceAccountProjects).register(Container.get(AgentServiceAccountService));
	});

	beforeEach(() => {
		// Some tests turn the flag off. The sharing targets need it on.
		agentsConfig.serviceAccountsEnabled = true;
		// The fixtures have no knowledge files. Avoid an external sandbox on delete.
		vi.spyOn(Container.get(AgentKnowledgeService), 'destroyKnowledgeSandbox').mockResolvedValue();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const expectServiceAccountWithPersonalProject = async (agentId: string, name: string) => {
		const { identityId } = await agentRepo.findOneByOrFail({ id: agentId });
		expect(identityId).toEqual(expect.any(String));
		const serviceAccount = await Container.get(ServiceAccountRepository).findById(identityId);
		expect(serviceAccount?.details.name).toBe(name);
		const personalProject =
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(identityId);
		expect(personalProject).toMatchObject({ type: 'personal', creatorId: identityId });
	};

	it('gives a new agent a service account with a personal project', async () => {
		const project = await createTeamProject();

		const agent = await agentsService.create(project.id, 'Support Agent', { actor });

		await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
	});

	it('sends an audit event with the user who created the agent', async () => {
		const project = await createTeamProject();
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const agent = await agentsService.create(project.id, 'Support Agent', { actor });

		const { identityId } = await agentRepo.findOneByOrFail({ id: agent.id });
		expect(emit).toHaveBeenCalledWith('agent-service-account-created', {
			user: actor.user,
			serviceAccountId: identityId,
			agentId: agent.id,
			projectId: project.id,
		});
	});

	it('sends an audit event with the login that created the agent', async () => {
		const project = await createTeamProject();
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

		const agent = await agentsService.create(project.id, 'Support Agent', { actor, ctx });

		expect(emit).toHaveBeenCalledWith(
			'agent-service-account-created',
			expect.objectContaining({ user: actor.user, loginId: 'login-1', agentId: agent.id }),
		);
	});

	it('sends no audit event when the agent insert fails', async () => {
		const project = await createTeamProject();
		const existing = await agentsService.create(project.id, 'First', { actor });
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await expect(
			agentsService.create(project.id, 'Second', { actor, id: existing.id }),
		).rejects.toThrow(ConflictError);

		expect(emit).not.toHaveBeenCalledWith('agent-service-account-created', expect.anything());
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

	it('rejects an imported agent with a blank name', async () => {
		const project = await createTeamProject();
		const owner = await createOwner();
		const id = nanoid();

		await expect(
			agentsService.create(project.id, '   ', {
				id,
				definition: { name: '   ', tools: {}, config: null, tasks: new Map() },
				user: owner,
				actor: { kind: 'user', user: owner },
			}),
		).rejects.toThrow(BadRequestError);

		expect(await agentRepo.findOneBy({ id })).toBeNull();
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
		const { identityId } = await agentRepo.findOneByOrFail({ id: first.id });

		await expect(agentRepo.update({ id: second.id }, { identityId })).rejects.toThrow();
	});

	it('gives a new agent a service account when agent service accounts are off', async () => {
		agentsConfig.serviceAccountsEnabled = false;
		const project = await createTeamProject();

		const agent = await agentsService.create(project.id, 'Support Agent', { actor });

		await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
	});

	it('rejects the delete of the service account while its agent exists', async () => {
		const project = await createTeamProject();
		const agent = await agentsService.create(project.id, 'Support Agent', { actor });
		const { identityId } = await agentRepo.findOneByOrFail({ id: agent.id });

		await expect(
			Container.get(DataSource).manager.delete(User, { id: identityId }),
		).rejects.toThrow();

		await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
	});

	describe('rename', () => {
		const rename = async (agentId: string, name: string) => {
			const agent = await agentRepo.findOneByOrFail({ id: agentId });
			agent.name = name;
			return await agentRepo.saveDraftFenced(agent);
		};

		it('renames the service account and its personal project with the agent', async () => {
			const project = await createTeamProject();
			const agent = await agentsService.create(project.id, 'Untitled', { actor });

			expect(await rename(agent.id, 'Support Agent')).toBe(true);

			await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
			const { identityId } = await agentRepo.findOneByOrFail({ id: agent.id });
			const personalProject =
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(identityId);
			expect(personalProject.name).toBe('Support Agent');
		});

		it('keeps the last name when the new name is blank', async () => {
			const project = await createTeamProject();
			const agent = await agentsService.create(project.id, 'Support Agent', { actor });

			expect(await rename(agent.id, '   ')).toBe(true);

			await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
		});

		it('does not save the agent name when the account rename fails', async () => {
			const project = await createTeamProject();
			const agent = await agentsService.create(project.id, 'Untitled', { actor });
			vi.spyOn(Container.get(ServiceAccountRepository), 'rename').mockRejectedValueOnce(
				new Error('rename failed'),
			);
			const draft = await agentRepo.findOneByOrFail({ id: agent.id });
			const { revision } = draft;
			draft.name = 'Support Agent';

			await expect(agentRepo.saveDraftFenced(draft)).rejects.toThrow('rename failed');

			expect((await agentRepo.findOneByOrFail({ id: agent.id })).name).toBe('Untitled');
			// The caller's agent keeps the stored revision, so a retry still passes the fence.
			expect(draft.revision).toBe(revision);
			expect(await agentRepo.saveDraftFenced(draft)).toBe(true);
			await expectServiceAccountWithPersonalProject(agent.id, 'Support Agent');
		});
	});
	describe('instance agents', () => {
		it('gives a registered instance agent a service account with a personal project', async () => {
			const agentId = nanoid();

			await Container.get(SystemAgentRegistrationService).register({
				agentId,
				name: 'Assistant',
				authorize: async () => true,
				prepareTurn: vi.fn(),
			});

			await expectServiceAccountWithPersonalProject(agentId, 'Assistant');
		});

		it('sends an audit event that names the system', async () => {
			const agentId = nanoid();
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await ensureInstanceAgent(agentId, 'Assistant');

			const { identityId } = await agentRepo.findOneByOrFail({ id: agentId });
			expect(emit).toHaveBeenCalledWith('agent-service-account-created', {
				user: null,
				source: 'startup',
				serviceAccountId: identityId,
				agentId,
				projectId: null,
			});
		});

		it('creates one service account when two mains start together', async () => {
			const agentId = nanoid();
			const before = await countServiceAccounts();
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await Promise.all([
				ensureInstanceAgent(agentId, 'Assistant'),
				ensureInstanceAgent(agentId, 'Assistant'),
			]);

			expect(await countServiceAccounts()).toBe(before + 1);
			await expectServiceAccountWithPersonalProject(agentId, 'Assistant');
			// The main that lost the race rolled back, so it sends no event.
			const created = emit.mock.calls.filter(([name]) => name === 'agent-service-account-created');
			expect(created).toHaveLength(1);
			const { identityId } = await agentRepo.findOneByOrFail({ id: agentId });
			expect(created[0][1]).toEqual(
				expect.objectContaining({ serviceAccountId: identityId, agentId }),
			);
		});

		it('keeps the service account when the instance agent registers again', async () => {
			const agentId = nanoid();
			await ensureInstanceAgent(agentId, 'Assistant');
			const { identityId } = await agentRepo.findOneByOrFail({ id: agentId });
			const before = await countServiceAccounts();

			await ensureInstanceAgent(agentId, 'Assistant');

			expect(await countServiceAccounts()).toBe(before);
			expect((await agentRepo.findOneByOrFail({ id: agentId })).identityId).toBe(identityId);
		});

		it('renames the service account when the instance agent is renamed', async () => {
			const agentId = nanoid();
			await ensureInstanceAgent(agentId, 'Assistant');

			await ensureInstanceAgent(agentId, 'n8n Assistant');

			await expectServiceAccountWithPersonalProject(agentId, 'n8n Assistant');
		});
	});

	describe('removal', () => {
		const dataSource = () => Container.get(DataSource).manager;

		/** Creates an agent with a service account, and returns its account and personal project. */
		const createAgentWithServiceAccount = async (projectId: string) => {
			const agent = await agentsService.create(projectId, 'Support Agent', { actor });
			const { identityId } = await agentRepo.findOneByOrFail({ id: agent.id });
			const personalProject =
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(identityId);
			return { agent, identityId: identityId!, personalProject };
		};

		const expectRemoved = async (identityId: string, personalProjectId: string) => {
			expect(await dataSource().existsBy(User, { id: identityId })).toBe(false);
			expect(await dataSource().existsBy(ServiceAccountDetails, { userId: identityId })).toBe(
				false,
			);
			expect(await dataSource().existsBy(Project, { id: personalProjectId })).toBe(false);
		};

		it('removes the service account, its personal project and its shares with the agent', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId, personalProject } = await createAgentWithServiceAccount(
				project.id,
			);
			const credential = await createCredentials(
				{ name: 'Shared', type: 'githubApi', data: '' },
				project,
			);
			await shareCredentialWithProjects(credential, [personalProject]);

			await agentsService.delete(agent.id, owner, project.id);

			await expectRemoved(identityId, personalProject.id);
			expect(
				await dataSource().existsBy(SharedCredentials, { projectId: personalProject.id }),
			).toBe(false);
			expect(
				await dataSource().existsBy(SharedCredentials, {
					credentialsId: credential.id,
					projectId: project.id,
				}),
			).toBe(true);
		});

		it('removes the service account when agent service accounts are off', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId, personalProject } = await createAgentWithServiceAccount(
				project.id,
			);
			agentsConfig.serviceAccountsEnabled = false;

			await agentsService.delete(agent.id, owner, project.id);

			await expectRemoved(identityId, personalProject.id);
		});

		it('moves the work of the personal project to the agent project', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId, personalProject } = await createAgentWithServiceAccount(
				project.id,
			);
			const workflow = await createWorkflow({}, personalProject);

			await agentsService.delete(agent.id, owner, project.id);

			await expectRemoved(identityId, personalProject.id);
			const sharing = await dataSource().findOneByOrFail(SharedWorkflow, {
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
			expect(sharing.projectId).toBe(project.id);
		});

		it('names the user and the login that deleted the agent in the user-deleted event', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);
			const emit = vi.spyOn(Container.get(EventService), 'emit');
			const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

			await agentsService.delete(agent.id, owner, project.id, {}, ctx);

			expect(emit).toHaveBeenCalledWith(
				'user-deleted',
				expect.objectContaining({ user: owner, targetUserId: identityId, loginId: 'login-1' }),
			);
		});

		it('sends an audit event with the user and the login that deleted the agent', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);
			const emit = vi.spyOn(Container.get(EventService), 'emit');
			const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

			await agentsService.delete(agent.id, owner, project.id, {}, ctx);

			expect(emit).toHaveBeenCalledWith('agent-service-account-deleted', {
				user: owner,
				loginId: 'login-1',
				serviceAccountId: identityId,
				agentId: agent.id,
				projectId: project.id,
			});
		});

		it('sends an audit event that names the system for a SCIM deletion', async () => {
			const project = await createTeamProject();
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await Container.get(AgentServiceAccountService).deleteForAgent(
				await agentRepo.findOneByOrFail({ id: agent.id }),
				{ kind: 'system', reason: 'scim' },
				undefined,
				{},
				async () => {},
			);

			expect(emit).toHaveBeenCalledWith('agent-service-account-deleted', {
				user: null,
				source: 'scim',
				serviceAccountId: identityId,
				agentId: agent.id,
				projectId: project.id,
			});
		});

		it('keeps the agent and its service account when the removal fails', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);
			vi.spyOn(Container.get(ServiceAccountService), 'remove').mockRejectedValueOnce(
				new Error('transfer blocked'),
			);

			await expect(agentsService.delete(agent.id, owner, project.id)).rejects.toThrow(
				'transfer blocked',
			);

			expect(await agentRepo.findOneBy({ id: agent.id })).not.toBeNull();
			expect(await dataSource().existsBy(User, { id: identityId })).toBe(true);
		});

		it('keeps the agent and its account when an approval reference remains after cleanup', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId, personalProject } = await createAgentWithServiceAccount(
				project.id,
			);
			const workflow = await createWorkflow({}, project);
			await agentRepo.update(agent.id, { approvalWorkflowId: workflow.id });
			vi.spyOn(Container.get(AgentApprovalCleanupService), 'cleanupAgent').mockResolvedValueOnce();

			await expect(agentsService.delete(agent.id, owner, project.id)).rejects.toThrow(
				ConflictError,
			);

			expect(await agentRepo.existsBy({ id: agent.id })).toBe(true);
			expect(await dataSource().existsBy(User, { id: identityId })).toBe(true);
			expect(await dataSource().existsBy(Project, { id: personalProject.id })).toBe(true);
		});

		it('keeps the agent row when the account row cannot be deleted', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);
			vi.spyOn(Container.get(UserRepository), 'deleteAccount').mockRejectedValueOnce(
				new Error('account delete failed'),
			);
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await expect(agentsService.delete(agent.id, owner, project.id)).rejects.toThrow(
				'account delete failed',
			);

			// Both rows go in one transaction, so a retry still finds the agent.
			expect(await agentRepo.findOneBy({ id: agent.id })).not.toBeNull();
			expect(await dataSource().existsBy(User, { id: identityId })).toBe(true);
			expect(emit).not.toHaveBeenCalledWith('agent-service-account-deleted', expect.anything());
		});

		it('removes the service accounts of the agents of a deleted project', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { identityId, personalProject } = await createAgentWithServiceAccount(project.id);

			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await Container.get(ProjectService).deleteProject(owner, project.id);

			await expectRemoved(identityId, personalProject.id);
			expect(emit).toHaveBeenCalledWith('agent-service-account-deleted', {
				user: owner,
				loginId: undefined,
				source: 'project-deletion',
				serviceAccountId: identityId,
				agentId: expect.any(String),
				projectId: project.id,
			});
		});

		it('moves the work of the service account to the target of a project deletion', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const target = await createTeamProject(undefined, owner);
			const { identityId, personalProject } = await createAgentWithServiceAccount(project.id);
			const workflow = await createWorkflow({}, personalProject);

			await Container.get(ProjectService).deleteProject(owner, project.id, {
				migrateToProject: target.id,
			});

			await expectRemoved(identityId, personalProject.id);
			const sharing = await dataSource().findOneByOrFail(SharedWorkflow, {
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
			expect(sharing.projectId).toBe(target.id);
		});

		it('removes the service accounts of the agents in the personal project of a deleted user', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const memberProject = await getPersonalProject(member);
			const target = await createTeamProject(undefined, owner);
			const { identityId, personalProject } = await createAgentWithServiceAccount(memberProject.id);
			const workflow = await createWorkflow({}, personalProject);
			const emit = vi.spyOn(Container.get(EventService), 'emit');
			const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

			await Container.get(UserService).deleteUser(owner, member.id, target.id, false, ctx);

			await expectRemoved(identityId, personalProject.id);
			const sharing = await dataSource().findOneByOrFail(SharedWorkflow, {
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
			expect(sharing.projectId).toBe(target.id);
			expect(emit).toHaveBeenCalledWith(
				'user-deleted',
				expect.objectContaining({ user: owner, targetUserId: identityId, loginId: 'login-1' }),
			);
			expect(emit).toHaveBeenCalledWith(
				'agent-service-account-deleted',
				expect.objectContaining({
					user: owner,
					loginId: 'login-1',
					source: 'project-deletion',
					serviceAccountId: identityId,
				}),
			);
		});

		it('rejects a direct deletion of the service account of an agent', async () => {
			const owner = await createOwner();
			const project = await createTeamProject(undefined, owner);
			const { agent, identityId } = await createAgentWithServiceAccount(project.id);

			const result = Container.get(UserService).deleteUser(owner, identityId);

			await expect(result).rejects.toThrow(BadRequestError);
			await expect(result).rejects.toThrow('belongs to the agent "Support Agent"');
			expect(await dataSource().existsBy(User, { id: identityId })).toBe(true);
			expect((await agentRepo.findOneByOrFail({ id: agent.id })).identityId).toBe(identityId);
		});

		it('deletes a service account that no agent uses', async () => {
			const owner = await createOwner();
			const { serviceAccount, project } =
				await Container.get(ServiceAccountService).create('Unused account');

			await Container.get(UserService).deleteUser(owner, serviceAccount.id);

			await expectRemoved(serviceAccount.id, project.id);
		});
	});

	describe('as sharing targets', () => {
		const createAgentIn = async (projectName: string, agentName: string) => {
			const project = await createTeamProject(projectName);
			const agent = await agentsService.create(project.id, agentName, { actor });
			const { identityId } = await agentRepo.findOneByOrFail({ id: agent.id });
			const personalProject =
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(identityId);
			return { project, personalProject };
		};

		// `search` keeps the result independent of the projects that other tests create.
		const listCandidates = async (
			user: Awaited<ReturnType<typeof createMember>>,
			search?: string,
		) => {
			const { projects } = await Container.get(ProjectService).getShareableProjectsAndCount(user, {
				take: 50,
				search,
				includeServiceAccounts: true,
			});
			return projects;
		};

		it('shows two agents with the same name with the project of each', async () => {
			const owner = await createOwner();
			const marketing = await createAgentIn('Marketing', 'Support bot');
			const sales = await createAgentIn('Sales', 'Support bot');

			const projects = await listCandidates(owner, 'Support bot');

			expect(projects.find((p) => p.id === marketing.personalProject.id)).toMatchObject({
				name: 'Support bot',
				accountKind: 'service',
				accountProject: { id: marketing.project.id, name: 'Marketing' },
			});
			expect(projects.find((p) => p.id === sales.personalProject.id)).toMatchObject({
				name: 'Support bot',
				accountKind: 'service',
				accountProject: { id: sales.project.id, name: 'Sales' },
			});
		});

		it('shows a member only the agents of their own projects', async () => {
			const member = await createMember();
			const marketing = await createAgentIn('Marketing', 'Marketing bot');
			const sales = await createAgentIn('Sales', 'Sales bot');
			await linkUserToProject(member, marketing.project, 'project:viewer');

			const projects = await listCandidates(member);

			expect(projects.find((p) => p.id === marketing.personalProject.id)).toMatchObject({
				accountKind: 'service',
				accountProject: { id: marketing.project.id, name: 'Marketing' },
			});
			expect(projects.find((p) => p.id === sales.personalProject.id)).toBeUndefined();
		});

		it('shows no agent when the flag is off', async () => {
			const owner = await createOwner();
			const marketing = await createAgentIn('Marketing', 'Marketing bot');
			agentsConfig.serviceAccountsEnabled = false;

			const projects = await listCandidates(owner);

			expect(projects.find((p) => p.id === marketing.personalProject.id)).toBeUndefined();
		});
	});
});
