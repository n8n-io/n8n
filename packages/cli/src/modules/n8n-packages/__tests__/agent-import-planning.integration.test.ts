import {
	AI_GATEWAY_MANAGED_TAG,
	AgentJsonConfigSchema,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	ProjectRepository,
	WorkflowEntity,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { NodeTypes } from '@/node-types';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createCredentials } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { importPackageRequest } from './fixtures/import-request';
import { ImportOrchestrator, type ImportOrchestrationInput } from '../engine/import-orchestrator';
import type { PreparedAgent } from '../entities/agent/agent-import.types';
import type { WorkflowConflictPolicy, WorkflowPublishingPolicy } from '../n8n-packages.types';

const license = new LicenseMocker();
mockInstance(ActiveWorkflowManager);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
let planner: ImportOrchestrator;
let user: User;
let project: Project;
let otherProject: Project;
let agents: AgentRepository;

beforeAll(async () => {
	await testModules.loadModules(['agents', 'n8n-packages']);
	await testDb.init();
	license.mockLicenseState(Container.get(LicenseState));
	planner = Container.get(ImportOrchestrator);
	agents = Container.get(AgentRepository);
	user = await createOwner();
	project = await createTeamProject('Destination', user);
	otherProject = await createTeamProject('Other destination', user);
}, 60_000);
beforeEach(async () => {
	await agents.delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
	]);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => await testDb.terminate());

function agent(sourceAgentId: string, config: Partial<AgentJsonConfig> = {}): PreparedAgent {
	return {
		sourceAgentId,
		name: sourceAgentId,
		config: AgentJsonConfigSchema.parse({
			name: sourceAgentId,
			model: '',
			instructions: '',
			...config,
		}),
		availableInMCP: false,
		skills: {},
		tools: {},
		tasks: {},
		metadata: { versionId: 'source-version', publishedVersionId: null },
	};
}

function input(sources: PreparedAgent[], projectId = project.id): ImportOrchestrationInput {
	const request = importPackageRequest({
		user,
		packageBuffer: Buffer.alloc(0),
		workflowConflictPolicy: 'new-version',
	});
	return {
		context: { user, projectId, folderId: null },
		agents: sources,
		folders: [],
		workflows: [],
		options: { ...request, folderConflictPolicy: 'merge' },
		credentialRequest: { requirements: [], matchingMode: 'id-only', missingMode: 'must-preexist' },
		dataTableRequest: {
			requirements: [],
			packageDataTables: [],
			matchingMode: 'by-id',
			missingMode: 'create',
			schemaConflictPolicy: 'keep-existing',
		},
		variableRequest: {
			requirements: [],
			missingMode: 'do-nothing',
			conflictPolicy: 'keep-existing',
		},
		tagRequest: { requirements: [], missingMode: 'create', conflictPolicy: 'skip' },
	};
}

async function records() {
	return await Promise.all([
		agents.find({ order: { id: 'ASC' } }),
		Container.get(AgentTaskRepository).find({ order: { id: 'ASC' } }),
		Container.get(CredentialsRepository).find({ order: { id: 'ASC' } }),
		Container.get(WorkflowRepository).find({ order: { id: 'ASC' } }),
		Container.get(ProjectRepository).find({ order: { id: 'ASC' } }),
		Container.get(AgentHistoryRepository).find({ order: { versionId: 'ASC' } }),
	]);
}

it('plans cycles, typed bindings and task IDs without changing definitions or destination records', async () => {
	const first = agent('shared', {
		model: 'openai/gpt-4.1-mini',
		credential: 'model-credential',
		skills: [{ type: 'skill', id: 'skill_review' }],
		subAgents: { agents: [{ agentId: 'second' }] },
		tools: [
			{
				type: 'workflow',
				workflowId: 'shared',
				workflow: 'Lookup',
				inputs: {
					payload: {
						mode: 'fixed',
						value: { credential: 'model-credential', workflowId: 'shared' },
					},
				},
			},
		],
		tasks: [{ type: 'task', id: 'task_source', enabled: false }],
	});
	first.skills.skill_review = { name: 'Review', description: 'Review.', instructions: 'Review.' };
	first.tools.custom_review = {
		code: 'return { agentId: "second", credential: "model-credential" };',
		descriptor: {
			name: 'custom_review',
			description: 'Review.',
			inputSchema: { type: 'object' },
			systemInstruction: null,
			outputSchema: null,
			hasSuspend: false,
			hasResume: false,
			hasToMessage: false,
			requireApproval: false,
			providerOptions: { provider: { credential: 'model-credential', agentId: 'second' } },
		},
	};
	first.config!.tools!.push({ type: 'custom', id: 'custom_review' });
	first.tasks.task_source = {
		name: 'Summary',
		objective: 'Summarize.',
		cronExpression: '0 9 * * *',
		timezone: null,
	};
	const second = agent('second', {
		model: 'openai/gpt-4.1-mini',
		credential: AI_GATEWAY_MANAGED_TAG,
		subAgents: { agents: [{ agentId: 'shared' }] },
	});
	const request = input([first, second]);
	request.workflows = [
		{
			entity: Object.assign(new WorkflowEntity(), {
				id: 'shared',
				name: 'Lookup',
				nodes: [],
				connections: {},
			}),
			sourceWorkflowId: 'shared',
			sourceArchived: false,
			parentFolderId: null,
		},
	];
	request.credentialRequest = {
		matchingMode: 'name-and-type',
		missingMode: 'create-stub',
		requirements: [
			{
				id: 'model-credential',
				type: 'openAiApi',
				name: 'Model',
				usedBy: [{ kind: 'agent', id: 'shared' }],
			},
		],
	};
	const before = await records();
	const original = structuredClone(request.agents);
	const plan = await planner.plan(request);
	await planner.assertNotBlocked([plan], { apiKeyScopes: undefined });
	const [a, b] = plan.agentPlan!.items;
	const workflowId =
		plan.workflowPlan.items[0].action === 'create' ? plan.workflowPlan.items[0].decidedId : '';
	expect(a.targetAgentId).not.toBe(workflowId);
	expect(a.config?.subAgents?.agents?.[0].agentId).toBe(b.targetAgentId);
	expect(b.config?.subAgents?.agents?.[0].agentId).toBe(a.targetAgentId);
	expect(a.config?.tools?.[0]).toMatchObject({
		workflowId,
		inputs: first.config?.tools?.[0].type === 'workflow' ? first.config.tools[0].inputs : undefined,
	});
	expect(a.config?.credential).toBe(plan.credentialPlan.stubIds.get('model-credential'));
	expect(b.config?.credential).toBe(AI_GATEWAY_MANAGED_TAG);
	expect(a.skills).toEqual(first.skills);
	expect(a.tools).toEqual(first.tools);
	expect(a.config?.skills).toEqual(first.config?.skills);
	expect(a.taskIds.get('task_source')).not.toBe('task_source');
	expect(Object.keys(a.tasks)).toEqual([a.config?.tasks?.[0].id]);
	expect(plan.agentPlan!.bindings.workflows.get('shared')).toBe(workflowId);
	expect(request.agents).toEqual(original);
	expect(await records()).toEqual(before);
});

it.each<WorkflowConflictPolicy>(['new-version', 'skip', 'fail'])(
	'applies %s without resolving unused skipped definitions',
	async (policy) => {
		const existing = await agents.save({
			id: 'destination',
			name: 'Existing',
			projectId: project.id,
			sourceAgentId: 'source',
		});
		const source = agent('source');
		if (policy === 'skip') source.config!.credential = 'unavailable';
		const request = input([source]);
		request.options.workflowConflictPolicy = policy;
		request.credentialRequest.requirements = [
			{ id: 'unavailable', usedBy: [{ kind: 'agent', id: 'source' }] },
		];
		if (policy !== 'skip') request.credentialRequest.requirements = [];
		else {
			const member = await createMember();
			const role = await createCustomRoleWithScopeSlugs(['agent:read'], { roleType: 'project' });
			await linkUserToProject(member, project, role.slug);
			request.context.user = member;
			source.tasks.task_unused = {
				name: 'Unused',
				objective: '',
				cronExpression: 'invalid',
				timezone: null,
			};
			request.dataTableRequest.requirements = [
				{ id: 'unused-table', name: 'Unused', usedBy: [{ kind: 'agent', id: 'source' }] },
			];
			request.variableRequest.requirements = [
				{ name: 'UNUSED', globalPlacement: false, usedBy: [{ kind: 'agent', id: 'source' }] },
			];
			request.variableRequest.missingMode = 'must-preexist';
			request.credentialRequest.missingMode = 'create-stub';
			request.credentialRequest.credentialBindings = new Map([['unavailable', 'missing-target']]);
		}
		const plan = await planner.plan(request);
		if (policy === 'fail') {
			expect(plan.blockingIssues).toContainEqual(
				expect.objectContaining({ type: 'agent-conflict', kind: 'existing' }),
			);
		} else {
			expect(plan.blockingIssues).toEqual([]);
			expect(plan.agentPlan!.items[0]).toMatchObject({
				action: policy === 'skip' ? 'skip' : 'update',
				targetAgentId: existing.id,
			});
			expect(plan.credentialPlan.failures).toEqual([]);
			expect(plan.credentialPlan.stubIds.size).toBe(0);
			if (policy === 'skip') {
				expect(plan.agentPlan!.items[0].taskIds.size).toBe(0);
				await planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:read'] });
			}
		}
	},
);

it('resolves existing dependencies by source identity and rejects missing references without writes', async () => {
	await agents.save({
		id: 'child-local',
		name: 'Child',
		projectId: project.id,
		sourceAgentId: 'child-source',
	});
	const workflow = await createWorkflow({ name: 'Lookup', nodes: [], connections: {} }, project);
	await Container.get(WorkflowRepository).update(workflow.id, {
		sourceWorkflowId: 'workflow-source',
	});
	const request = input([
		agent('parent', {
			subAgents: { agents: [{ agentId: 'child-source' }] },
			tools: [{ type: 'workflow', workflow: 'Lookup', workflowId: 'workflow-source' }],
		}),
	]);
	const before = await records();
	const plan = await planner.plan(request);
	expect(plan.blockingIssues).toEqual([]);
	expect(plan.agentPlan!.items[0].config).toMatchObject({
		subAgents: { agents: [{ agentId: 'child-local' }] },
		tools: [{ workflowId: workflow.id }],
	});
	request.agentRequirements = [{ id: 'missing', usedBy: [{ kind: 'agent', id: 'parent' }] }];
	const blocked = await planner.plan(request);
	expect(blocked.blockingIssues).toContainEqual(
		expect.objectContaining({
			type: 'agent-dependency-unresolved',
			referenceId: 'missing',
			reason: 'missing',
		}),
	);
	await expect(
		planner.assertNotBlocked([blocked], { apiKeyScopes: undefined }),
	).rejects.toMatchObject({ httpStatusCode: 422 });
	expect(await records()).toEqual(before);
});

it('keeps credential matches scoped to each project and reports an inaccessible explicit binding', async () => {
	const credentials = await Promise.all(
		[project, otherProject].map(
			async (destination) =>
				await createCredentials({ name: 'Model', type: 'openAiApi', data: '' }, destination),
		),
	);
	const requests = [project, otherProject].map((destination, index) => {
		const source = agent(`agent-${index}`, {
			model: 'openai/gpt-4.1-mini',
			credential: 'source-credential',
		});
		const request = input([source], destination.id);
		request.credentialRequest = {
			requirements: [
				{
					id: 'source-credential',
					name: 'Model',
					type: 'openAiApi',
					usedBy: [{ kind: 'agent', id: source.sourceAgentId }],
				},
			],
			matchingMode: 'name-and-type',
			missingMode: 'must-preexist',
		};
		return request;
	});
	const before = await records();
	const plans = await planner.planPackage(requests);
	for (const [index, plan] of plans.entries()) {
		expect(plan.blockingIssues).toEqual([]);
		expect(plan.agentPlan!.items[0].config?.credential).toBe(credentials[index].id);
	}
	const [request] = requests;
	delete request.credentialRequest.requirements![0].type;
	request.credentialRequest.credentialBindings = new Map([
		['source-credential', credentials[1].id],
	]);
	const original = structuredClone(request.agents);
	const blocked = await planner.plan(request);
	expect(blocked.blockingIssues).toContainEqual(
		expect.objectContaining({
			type: 'credential-unresolved',
			sourceId: 'source-credential',
			targetId: credentials[1].id,
		}),
	);
	expect(blocked.agentPlan!.items[0].config?.credential).toBe('source-credential');
	expect(request.agents).toEqual(original);
	expect(await records()).toEqual(before);
});

it('checks project boundaries after allocating the whole package', async () => {
	vi.spyOn(Container.get(NodeTypes), 'getSupportedVersions').mockReturnValue([1]);
	const node = (workflowId: unknown) => ({
		type: 'node' as const,
		name: 'Execute',
		enabled: false,
		node: {
			nodeType: 'n8n-nodes-base.executeWorkflow',
			nodeTypeVersion: 1,
			nodeParameters: { workflowId },
		},
	});
	const expression = '={{ $json.workflowId }}';
	const local = input([
		agent('parent', {
			subAgents: { agents: [{ agentId: 'child' }] },
			tools: [
				{ type: 'workflow', workflowId: 'remote-workflow', workflow: 'Remote' },
				node({ __rl: true, value: 'remote-workflow', mode: 'list' }),
				node(expression),
			],
		}),
	]);
	const remote = input([agent('child')], otherProject.id);
	remote.workflows = [
		{
			entity: Object.assign(new WorkflowEntity(), {
				id: 'remote-workflow',
				name: 'Remote',
				nodes: [],
				connections: {},
			}),
			sourceWorkflowId: 'remote-workflow',
			sourceArchived: false,
			parentFolderId: null,
		},
	];
	const plans = await planner.planPackage([local, remote]);
	expect(plans[0].blockingIssues).toContainEqual(
		expect.objectContaining({
			type: 'agent-dependency-unresolved',
			referenceId: 'child',
			reason: 'inaccessible',
		}),
	);
	expect(plans[1].blockingIssues).toEqual([]);
	expect(plans[0].blockingIssues).toContainEqual(
		expect.objectContaining({
			type: 'agent-dependency-unresolved',
			dependencyType: 'workflow',
			referenceId: 'remote-workflow',
			reason: 'inaccessible',
		}),
	);
	const [workflow] = plans[1].workflowPlan.items;
	const workflowId = workflow.action === 'create' ? workflow.decidedId : workflow.existing.id;
	const tools = plans[0].agentPlan!.items[0].config?.tools;
	expect(tools?.[1]).toMatchObject({
		node: { nodeParameters: { workflowId: { value: workflowId } } },
	});
	expect(tools?.[2]).toMatchObject({ node: { nodeParameters: { workflowId: expression } } });
});

it('reports task ownership conflicts across project plans', async () => {
	const requests = [input([agent('first')]), input([agent('second')], otherProject.id)];
	for (const request of requests) {
		request.options.workflowIdPolicy = 'source';
		request.agents![0].tasks.task_shared = {
			name: 'Summary',
			objective: 'Summarize.',
			cronExpression: '0 9 * * *',
			timezone: null,
		};
		request.agents![0].config!.tasks = [{ type: 'task', id: 'task_shared', enabled: false }];
	}
	const plans = await planner.planPackage(requests);
	expect(plans.flatMap((plan) => plan.blockingIssues)).toContainEqual(
		expect.objectContaining({
			type: 'agent-conflict',
			kind: 'task-id',
			sourceTaskId: 'task_shared',
		}),
	);
});

it.each(['skills', 'self-reference'] as const)(
	'uses the UI validation rule for %s',
	async (invalid) => {
		const source = agent('source');
		if (invalid === 'skills') {
			source.skills = {
				skill_first: { name: 'Review', description: 'Review.', instructions: 'Review the change.' },
				skill_second: {
					name: 'review',
					description: 'Review.',
					instructions: 'Review the change.',
				},
			};
		} else source.config!.subAgents = { agents: [{ agentId: 'source' }] };
		const before = await records();
		const plan = await planner.plan(input([source]));
		expect(plan.blockingIssues).toContainEqual(
			expect.objectContaining({
				type: 'agent-invalid',
				message: expect.stringMatching(invalid === 'skills' ? /skill name/i : /itself/),
			}),
		);
		expect(await records()).toEqual(before);
	},
);

it.each(['create', 'update', 'publish', 'unpublish'] as const)(
	'requires the %s action scope in addition to read and workflow import',
	async (action) => {
		const member = await createMember();
		const required = `agent:${action}`;
		const scopes = [
			'agent:read',
			'workflow:import',
			'agent:create',
			'agent:update',
			'agent:publish',
			'agent:unpublish',
		];
		const role = await createCustomRoleWithScopeSlugs(
			scopes.filter((scope) => scope !== required),
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, role.slug);
		if (action !== 'create') {
			await agents.save({
				id: 'existing',
				sourceAgentId: 'source',
				name: 'Existing',
				projectId: project.id,
			});
			if (action === 'unpublish') {
				await Container.get(AgentHistoryRepository).saveVersion({
					agentId: 'existing',
					versionId: 'published',
					schema: null,
					skills: {},
					tools: {},
					publishedBy: 'Test',
				});
				await agents.update('existing', { activeVersionId: 'published' });
			}
		}
		const request = input([agent('source')]);
		request.context.user = member;
		const policies: Record<typeof action, WorkflowPublishingPolicy> = {
			create: 'preserve-published-state',
			update: 'preserve-published-state',
			publish: 'publish-all',
			unpublish: 'unpublish-all',
		};
		request.options.workflowPublishingPolicy = policies[action];
		const before = await records();
		await expect(planner.plan(request)).rejects.toBeInstanceOf(ForbiddenError);
		const permittedRole = await createCustomRoleWithScopeSlugs(scopes, { roleType: 'project' });
		await linkUserToProject(member, project, permittedRole.slug);
		const plan = await planner.plan(request);
		expect(plan.blockingIssues).toEqual([]);
		await expect(
			planner.assertNotBlocked([plan], {
				apiKeyScopes: scopes.filter((scope) => scope !== required),
			}),
		).rejects.toBeInstanceOf(ForbiddenError);
		expect(await records()).toEqual(before);
	},
);

it('plans an authorized pending project without creating its shell and still checks API-key scopes', async () => {
	const request = input([agent('source')], 'pending-project');
	request.projectPendingCreation = true;
	const before = await records();
	const plan = await planner.plan(request);
	expect(plan.blockingIssues).toEqual([]);
	await expect(
		planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:read'] }),
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:read', 'agent:create'] }),
	).resolves.toBeUndefined();
	expect(await records()).toEqual(before);
});

it('reports save-policy refusal without enforcing a save or changing records', async () => {
	const enforcement = Container.get(PolicyEnforcementService);
	const violation = {
		kind: 'node-type-unavailable' as const,
		checkId: 'node-type-availability',
		message: 'This node type is unavailable.',
	};
	const evaluate = vi
		.spyOn(enforcement, 'evaluateWorkflowSave')
		.mockResolvedValue({ violations: [violation] });
	const enforce = vi.spyOn(enforcement, 'enforceWorkflowSave');
	const before = await records();
	const plan = await planner.plan(input([agent('source')]));
	expect(plan.blockingIssues).toContainEqual({
		type: 'agent-policy-violation',
		sourceAgentId: 'source',
		name: 'source',
		violations: [violation],
	});
	expect(evaluate).toHaveBeenCalledWith(
		expect.objectContaining({
			workflow: expect.objectContaining({ artifactKind: 'agent', name: 'source' }),
			storedWorkflow: null,
			projectId: project.id,
		}),
	);
	expect(enforce).not.toHaveBeenCalled();
	expect(await records()).toEqual(before);
});
