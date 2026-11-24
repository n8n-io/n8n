import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import {
	CredentialsRepository,
	ExecutionRepository,
	ProjectRelationRepository,
	ServiceAccountRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { LicenseMocker } from '@test-integration/license';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import { AgentAccountStatusService } from '@/modules/agents/agent-account-status.service';
import { onBehalfOfParent } from '@/modules/agents/agent-run-security';
import {
	AgentDisabledError,
	AgentRuntimeIdentityService,
} from '@/modules/agents/agent-runtime-identity.service';
import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { NodeToolAiGatewayService } from '@/modules/agents/json-config/node-tool-ai-gateway.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { registerServiceAccountUsage } from '@/modules/agents/register-service-account-usage';
import { AgentServiceAccountService } from '@/modules/agents/agent-service-account.service';
import { ServiceAccountProjects } from '@/services/service-account-projects';
import { License } from '@/license';
import { ProjectAgentAccessService } from '@/services/project-agent-access.service';
import { ProjectService } from '@/services/project.service.ee';
import { RuntimeAccessService } from '@/services/runtime-access.service';
import { AgentDirectory } from '@/services/agent-directory';
import { ExecutionAgentAttributionService } from '@/executions/execution-agent-attribution.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { createRunExecutionData } from 'n8n-workflow';
import { createExecution } from '../shared/db/executions';
import { Telemetry } from '@/telemetry';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';

import { createCredentials, shareCredentialWithProjects } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

const actor = { kind: 'user', user: { id: 'user-1' } } as const;

describe('Agent runtime identity', () => {
	let agentsService: AgentsService;
	let agentRepo: AgentRepository;
	let agentsConfig: AgentsConfig;
	let runtimeIdentity: AgentRuntimeIdentityService;
	mockInstance(Telemetry);
	mockInstance(AgentUpdateBroadcaster);
	mockInstance(NodeToolAiGatewayService);

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		const license = new LicenseMocker();
		license.mock(Container.get(License));
		license.mockLicenseState(Container.get(LicenseState));
		license.enable('feat:projectRole:viewer');
		await Container.get(AgentsSettingsService).setEnabled(true);
		agentsService = Container.get(AgentsService);
		agentRepo = Container.get(AgentRepository);
		agentsConfig = Container.get(AgentsConfig);
		runtimeIdentity = Container.get(AgentRuntimeIdentityService);
		registerServiceAccountUsage();
		// The module registers this in `init`, which tests do not run.
		Container.get(ServiceAccountProjects).register(Container.get(AgentServiceAccountService));
		Container.get(AgentDirectory).register({
			findAgents: async (ids) =>
				new Map(
					(await Container.get(AgentRepository).findSummariesByIds(ids)).map((agent) => [
						agent.id,
						{ name: agent.name, projectId: agent.projectId },
					]),
				),
		});
	});

	beforeEach(() => {
		agentsConfig.runtimeIdentityEnabled = true;
		vi.spyOn(Container.get(AgentKnowledgeService), 'destroyKnowledgeSandbox').mockResolvedValue();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		agentsConfig.runtimeIdentityEnabled = false;
		await testDb.terminate();
	});

	const createAgentIn = async (projectId: string, name = 'Support Agent') => {
		const { id } = await agentsService.create(projectId, name, { actor });
		return await agentRepo.findOneByOrFail({ id });
	};

	const roleOf = async (userId: string, projectId: string) =>
		(
			await Container.get(ProjectRelationRepository).findOne({
				where: { userId, projectId },
				relations: { role: true },
			})
		)?.role.slug;

	describe('membership', () => {
		it('gives the account of a new agent the agent role in its team project', async () => {
			const project = await createTeamProject();

			const agent = await createAgentIn(project.id);

			expect(await roleOf(agent.identityId, project.id)).toBe('project:agent');
		});

		it('gives the account of an agent in a personal project no membership', async () => {
			const member = await createMember();
			const personalProject = await getPersonalProject(member);

			const agent = await createAgentIn(personalProject.id);

			expect(await roleOf(agent.identityId, personalProject.id)).toBeUndefined();
		});

		it('keeps the agent membership when an admin replaces the project members', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const member = await createMember();

			await Container.get(ProjectService).syncProjectRelations(project.id, [
				{ userId: member.id, role: 'project:viewer' },
			]);

			expect(await roleOf(agent.identityId, project.id)).toBe('project:agent');
			expect(await roleOf(member.id, project.id)).toBe('project:viewer');
		});

		it('leaves the agent out of the project members', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			const relations = await Container.get(ProjectService).getProjectRelations(project.id);

			expect(relations.map((r) => r.userId)).not.toContain(agent.identityId);
		});
	});

	describe('acting account', () => {
		it('returns no account when the flag is off', async () => {
			agentsConfig.runtimeIdentityEnabled = false;
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			expect(await runtimeIdentity.resolveActingAccount(agent)).toBeUndefined();
		});

		it('returns the account with its role for an agent in a team project', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			const account = await runtimeIdentity.resolveActingAccount(agent);

			expect(account?.id).toBe(agent.identityId);
			expect(account?.kind).toBe('service');
			expect(account?.role.slug).toBe('global:agent');
		});

		it('returns no account for an agent in a personal project', async () => {
			const member = await createMember();
			const agent = await createAgentIn((await getPersonalProject(member)).id);

			expect(await runtimeIdentity.resolveActingAccount(agent)).toBeUndefined();
		});

		it('gives the workflow tools of a test run the account, but not for a disabled agent', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			const security = await runtimeIdentity.resolveWorkflowToolSecurity(agent);
			expect(security).toMatchObject({
				subject: { id: agent.identityId },
				authMethod: 'agent-run',
			});

			await Container.get(AgentServiceAccountService).setDisabled(agent, true);
			expect(await runtimeIdentity.resolveWorkflowToolSecurity(agent)).toBeUndefined();
		});

		it('refuses a disabled agent', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);
			await Container.get(ServiceAccountRepository).setDisabled(agent.identityId, true);

			await expect(runtimeIdentity.resolveActingAccount(agent)).rejects.toThrow(AgentDisabledError);
		});
	});

	describe('credentials', () => {
		it('lets the account use the credentials of its project, shares to it, and global ones', async () => {
			const owner = await createOwner();
			const project = await createTeamProject();
			const otherProject = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const account = await runtimeIdentity.resolveActingAccount(agent);
			if (!account) throw new Error('Expected an acting account');
			const personalProject = await getPersonalProject(account);

			const inProject = await createCredentials(
				{ name: 'In project', type: 'a', data: '' },
				project,
			);
			const sharedWithAgent = await createCredentials(
				{ name: 'Shared with agent', type: 'a', data: '' },
				otherProject,
			);
			await shareCredentialWithProjects(sharedWithAgent, [personalProject]);
			const elsewhere = await createCredentials(
				{ name: 'Elsewhere', type: 'a', data: '' },
				otherProject,
			);
			const global = await createCredentials(
				{ name: 'Global', type: 'a', data: '', isGlobal: true },
				await getPersonalProject(owner),
			);

			const usable =
				await Container.get(CredentialsService).getCredentialsAnAgentAccountCanUse(account);
			const ids = usable.map((c) => c.id);

			expect(ids).toEqual(expect.arrayContaining([inProject.id, sharedWithAgent.id, global.id]));
			expect(ids).not.toContain(elsewhere.id);
		});

		it('limits an agent set to shared credentials only to its shares and global ones', async () => {
			const owner = await createOwner();
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const identity = await runtimeIdentity.resolveRunIdentity(agent);
			if (!identity) throw new Error('Expected a run identity');
			const { account, security } = identity;

			const inProject = await createCredentials({ name: 'Stripe', type: 'a', data: '' }, project);
			const shared = await createCredentials(
				{ name: 'Google Sheets', type: 'a', data: '' },
				project,
			);
			await shareCredentialWithProjects(shared, [await getPersonalProject(account)]);
			const global = await createCredentials(
				{ name: 'Global', type: 'a', data: '', isGlobal: true },
				await getPersonalProject(owner),
			);
			const ids = [inProject.id, shared.id, global.id];
			const access = Container.get(RuntimeAccessService);
			const statusService = Container.get(AgentAccountStatusService);

			expect([...(await access.usableCredentialIds(security, ids))].sort()).toEqual(
				[...ids].sort(),
			);

			const status = await statusService.setSharedCredentialsOnly(agent.id, project.id, true);
			expect(status.sharedCredentialsOnly).toBe(true);

			expect([...(await access.usableCredentialIds(security, ids))].sort()).toEqual(
				[shared.id, global.id].sort(),
			);
			const listed =
				await Container.get(CredentialsService).getCredentialsAnAgentAccountCanUse(account);
			expect(listed.map((c) => c.id)).not.toContain(inProject.id);
			expect(listed.map((c) => c.id)).toContain(shared.id);

			// A workflow tool of another project follows the same rule.
			const sales = await createTeamProject();
			const nodes = [
				{
					id: 'node',
					name: 'Stripe',
					type: 'n8n-nodes-base.stripe',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials: { a: { id: inProject.id, name: inProject.name } },
				},
			];
			const salesWorkflow = await createWorkflow({ name: 'Sales tool', nodes }, sales);
			const checker = Container.get(CredentialsPermissionChecker);
			await expect(checker.check(salesWorkflow.id, nodes, account.id)).rejects.toThrow(
				'which you cannot use',
			);

			await statusService.setSharedCredentialsOnly(agent.id, project.id, false);
			expect(await access.canUse(security, { type: 'credential', id: inProject.id })).toBe(true);
			await expect(checker.check(salesWorkflow.id, nodes, account.id)).resolves.toBeDefined();
		});

		it('lets the account use the credentials of another project that it joins', async () => {
			const project = await createTeamProject();
			const otherProject = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const credential = await createCredentials(
				{ name: 'Other project', type: 'a', data: '' },
				otherProject,
			);
			await Container.get(ServiceAccountRepository).joinProjectAsAgent(
				agent.identityId,
				otherProject.id,
			);
			const account = await runtimeIdentity.resolveActingAccount(agent);
			if (!account) throw new Error('Expected an acting account');

			const usable =
				await Container.get(CredentialsService).getCredentialsAnAgentAccountCanUse(account);

			expect(usable.map((c) => c.id)).toContain(credential.id);
		});
	});

	describe('disable', () => {
		it('disables the agent and sends an audit event', async () => {
			const admin = await createMember();
			const project = await createTeamProject();
			await linkUserToProject(admin, project, 'project:admin');
			const agent = await createAgentIn(project.id);
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			const status = await Container.get(AgentAccountStatusService).setDisabled(
				agent.id,
				project.id,
				true,
				admin,
			);

			expect(status).toEqual({
				available: true,
				actsAsServiceAccount: true,
				disabled: true,
				sharedCredentialsOnly: false,
				otherProjects: [],
			});
			expect(emit).toHaveBeenCalledWith('agent-service-account-disabled-changed', {
				user: admin,
				disabled: true,
				serviceAccountId: agent.identityId,
				agentId: agent.id,
				projectId: project.id,
				loginId: undefined,
			});
			await expect(runtimeIdentity.resolveActingAccount(agent)).rejects.toThrow(AgentDisabledError);
		});

		it('refuses to disable when the flag is off', async () => {
			agentsConfig.runtimeIdentityEnabled = false;
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			await expect(
				Container.get(AgentAccountStatusService).setDisabled(
					agent.id,
					project.id,
					true,
					await createMember(),
				),
			).rejects.toThrow('Agent runtime identity is not enabled on this instance');
		});
	});

	describe('access to other projects', () => {
		const access = () => Container.get(ProjectAgentAccessService);

		it('lets a project admin give an agent of their other project access', async () => {
			const admin = await createMember();
			const home = await createTeamProject();
			const target = await createTeamProject();
			await linkUserToProject(admin, home, 'project:editor');
			await linkUserToProject(admin, target, 'project:admin');
			const agent = await createAgentIn(home.id);

			expect(
				(await access().listCandidates(admin, target.id)).map((a) => a.serviceAccountId),
			).toContain(agent.identityId);
			await access().add(admin, target.id, agent.identityId);

			expect(await roleOf(agent.identityId, target.id)).toBe('project:agent');
			expect(await access().list(target.id)).toEqual([
				{
					serviceAccountId: agent.identityId,
					name: 'Support Agent',
					homeProject: { id: home.id, name: home.name },
				},
			]);
		});

		it('does not let a member add an agent of a project they are not in', async () => {
			const admin = await createMember();
			const target = await createTeamProject();
			await linkUserToProject(admin, target, 'project:admin');
			const agent = await createAgentIn((await createTeamProject()).id);

			await expect(access().add(admin, target.id, agent.identityId)).rejects.toThrow(
				'Agent not found',
			);
		});

		it('removes the access, but not from the own project of the agent', async () => {
			const owner = await createOwner();
			const home = await createTeamProject();
			const target = await createTeamProject();
			const agent = await createAgentIn(home.id);
			await access().add(owner, target.id, agent.identityId);

			await access().remove(target.id, agent.identityId);
			expect(await roleOf(agent.identityId, target.id)).toBeUndefined();

			await expect(access().remove(home.id, agent.identityId)).rejects.toThrow(
				'An agent always has access to its own project',
			);
			expect(await roleOf(agent.identityId, home.id)).toBe('project:agent');
		});

		it('lists no agents when the flag is off', async () => {
			agentsConfig.runtimeIdentityEnabled = false;
			const project = await createTeamProject();
			await createAgentIn(project.id);

			expect(await access().list(project.id)).toEqual([]);
		});
	});

	describe('security context', () => {
		it('makes the agent account the subject, with no actor', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);

			const identity = await runtimeIdentity.resolveRunIdentity(agent);

			expect(identity?.security).toEqual({
				subject: expect.objectContaining({ id: agent.identityId, type: 'service' }),
				authMethod: 'agent-run',
			});
		});

		it('lets a node tool use only the credentials the agent account can use', async () => {
			const project = await createTeamProject();
			const otherProject = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const account = await runtimeIdentity.resolveActingAccount(agent);
			if (!account) throw new Error('Expected an acting account');

			const shared = await createCredentials({ name: 'Shared', type: 'a', data: '' }, otherProject);
			await shareCredentialWithProjects(shared, [await getPersonalProject(account)]);
			const own = await createCredentials({ name: 'Own', type: 'a', data: '' }, project);
			const elsewhere = await createCredentials(
				{ name: 'Elsewhere', type: 'a', data: '' },
				otherProject,
			);

			const usable = await Container.get(CredentialsRepository).findCredentialsUsableByAccount(
				agent.identityId,
				[shared.id, own.id, elsewhere.id],
			);

			expect(usable.map((c) => c.id).sort()).toEqual([shared.id, own.id].sort());
		});
	});

	describe('workflow tools from other projects', () => {
		it('finds a workflow of a project that gave the agent access', async () => {
			const owner = await createOwner();
			const home = await createTeamProject();
			const sales = await createTeamProject();
			const agent = await createAgentIn(home.id);
			const workflow = await createWorkflow({ name: 'Sales lookup' }, sales);
			const loader = Container.get(CallableWorkflowLoader);
			const reference = { workflowId: workflow.id, workflowName: workflow.name };

			const before = await runtimeIdentity.toolProjectIds(agent);
			expect(before).toEqual([home.id]);
			expect(await loader.loadWorkflow(before, reference)).toBeNull();

			await Container.get(ProjectAgentAccessService).add(owner, sales.id, agent.identityId);
			const after = await runtimeIdentity.toolProjectIds(agent);

			expect(after).toEqual([home.id, sales.id]);
			expect((await loader.loadWorkflow(after, reference))?.id).toBe(workflow.id);
		});

		it('lets a workflow tool run as the agent use a credential shared with the agent', async () => {
			const owner = await createOwner();
			const home = await createTeamProject();
			const agent = await createAgentIn(home.id);
			const account = await runtimeIdentity.resolveActingAccount(agent);
			if (!account) throw new Error('Expected an acting account');
			const credential = await createCredentials(
				{ name: 'JWT', type: 'jwtAuth', data: '' },
				await getPersonalProject(owner),
			);
			await shareCredentialWithProjects(credential, [await getPersonalProject(account)]);
			const nodes = [
				{
					id: 'jwt',
					name: 'JWT',
					type: 'n8n-nodes-base.jwt',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials: { jwtAuth: { id: credential.id, name: credential.name } },
				},
			];
			const workflow = await createWorkflow({ name: 'Workflow tool', nodes }, home);
			const checker = Container.get(CredentialsPermissionChecker);

			await expect(checker.check(workflow.id, nodes)).rejects.toThrow(
				'Node "JWT" does not have access to the credential',
			);
			await expect(checker.check(workflow.id, nodes, account.id)).resolves.toBeDefined();
		});

		it('keeps only the own project when the flag is off', async () => {
			agentsConfig.runtimeIdentityEnabled = false;
			const home = await createTeamProject();
			const agent = await createAgentIn(home.id);

			expect(await runtimeIdentity.toolProjectIds(agent)).toEqual([home.id]);
		});
	});
	describe('runtime access by identity', () => {
		it('decides workflows and data tables by what the agent account can use', async () => {
			const owner = await createOwner();
			const home = await createTeamProject();
			const sales = await createTeamProject();
			const agent = await createAgentIn(home.id);
			const identity = await runtimeIdentity.resolveRunIdentity(agent);
			if (!identity) throw new Error('Expected a run identity');
			const { security } = identity;
			const homeWorkflow = await createWorkflow({ name: 'Home tool' }, home);
			const salesWorkflow = await createWorkflow({ name: 'Sales tool' }, sales);
			const access = Container.get(RuntimeAccessService);
			const homeTable = { type: 'dataTable', projectId: home.id, access: 'write' } as const;
			const salesTable = { type: 'dataTable', projectId: sales.id, access: 'write' } as const;

			expect(await access.canUse(security, { type: 'workflow', id: homeWorkflow.id })).toBe(true);
			expect(await access.canUse(security, homeTable)).toBe(true);
			expect(await access.canUse(security, { type: 'workflow', id: salesWorkflow.id })).toBe(false);
			expect(await access.canUse(security, salesTable)).toBe(false);

			await Container.get(ProjectAgentAccessService).add(owner, sales.id, agent.identityId);

			expect(await access.canUse(security, { type: 'workflow', id: salesWorkflow.id })).toBe(true);
			expect(await access.canUse(security, salesTable)).toBe(true);
		});

		it('lets a sub-agent use the access of its parent', async () => {
			const home = await createTeamProject();
			const parent = await createAgentIn(home.id, 'Parent');
			const other = await createTeamProject();
			const child = await createAgentIn(other.id, 'Child');
			const parentIdentity = await runtimeIdentity.resolveRunIdentity(parent);
			const childAccount = await runtimeIdentity.resolveActingAccount(child);
			if (!parentIdentity || !childAccount) throw new Error('Expected accounts');
			const homeWorkflow = await createWorkflow({ name: 'Home tool' }, home);
			const security = onBehalfOfParent(parentIdentity.security, childAccount);

			expect(
				await Container.get(RuntimeAccessService).canUse(security, {
					type: 'workflow',
					id: homeWorkflow.id,
				}),
			).toBe(true);
		});
	});
	describe('executions list', () => {
		it('stores the agent of a workflow tool run on the execution', async () => {
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const workflow = await createWorkflow({ name: 'Tool' }, project);
			const parentAgentRun = {
				agentId: agent.id,
				projectId: project.id,
				threadId: 'thread-1',
				runId: 'run-1',
				toolCallId: 'call-1',
			};

			const id = await Container.get(ExecutionPersistence).create({
				data: createRunExecutionData({ parentAgentRun }),
				workflowData: workflow,
				workflowId: workflow.id,
				mode: 'integrated',
				finished: false,
				status: 'new',
			});

			const [summary] = await Container.get(ExecutionRepository).findManyByRangeQuery({
				kind: 'range',
				range: { limit: 10 },
				user: await createOwner(),
				workflowId: workflow.id,
			});
			expect(summary.id).toBe(id);
			expect(summary.agentId).toBe(agent.id);
		});

		it('filters by agent, and names the agent only to a viewer who can read it', async () => {
			const owner = await createOwner();
			const project = await createTeamProject();
			const agent = await createAgentIn(project.id);
			const workflow = await createWorkflow({ name: 'Tool' }, project);
			await createExecution({ agentId: agent.id }, workflow);
			await createExecution({}, workflow);

			const results = await Container.get(ExecutionRepository).findManyByRangeQuery({
				kind: 'range',
				range: { limit: 10 },
				user: owner,
				agentId: agent.id,
			});
			expect(results).toHaveLength(1);

			const attribution = Container.get(ExecutionAgentAttributionService);
			const forOwner = results.map((r) => ({ ...r }));
			await attribution.addAgents(owner, forOwner);
			expect(forOwner[0].agent).toEqual({
				id: agent.id,
				name: 'Support Agent',
				projectId: project.id,
			});

			const outsider = await createMember();
			const forOutsider = results.map((r) => ({ ...r }));
			await attribution.addAgents(outsider, forOutsider);
			expect(forOutsider[0].agent).toEqual({ id: agent.id, name: null, projectId: null });
		});
	});
});
