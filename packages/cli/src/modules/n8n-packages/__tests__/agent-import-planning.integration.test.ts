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
import { Credentials } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import { registerSkillAgentsProvider } from '@/modules/agents/register-skill-agents-provider';
import { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { TeamsIntegration } from '@/modules/agents/integrations/platforms/teams/teams-integration';
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
import { looseAgentsFixture, writeAgentPackageFixture } from './fixtures/agent-package-fixtures';
import { streamToBuffer } from './utils/tar-support';
import { ImportOrchestrator, type ImportOrchestrationInput } from '../engine/import-orchestrator';
import { WorkflowPackageImporter } from '../engine/workflow-package-importer';
import type { PreparedAgent } from '../entities/agent/agent-import.types';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { PackageImportConfig } from '../n8n-packages.config';
import type { ImportConflictPolicy, WorkflowPublishingPolicy } from '../n8n-packages.types';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';

const license = new LicenseMocker();
mockInstance(ActiveWorkflowManager);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
let planner: ImportOrchestrator;
let user: User;
let project: Project;
let otherProject: Project;
let agents: AgentRepository;

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents', 'n8n-packages']);
	await testDb.init();
	registerSkillAgentsProvider();
	license.mockLicenseState(Container.get(LicenseState));
	Container.get(ChatIntegrationRegistry).register(Container.get(TeamsIntegration));
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
		conflictPolicy: 'new-version',
	});
	return {
		context: { user, projectId, folderId: null },
		agents: sources,
		folders: [],
		workflows: [],
		options: { ...request, folderConflictPolicy: 'merge' },
		credentialRequest: {
			requirements: [],
			matchingMode: 'id-only',
			missingMode: 'must-preexist',
			conflictPolicy: 'keep-existing',
			updateScope: { projectIds: new Set([projectId]) },
		},
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
		checkRootPlacement: false,
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

it('seeds bundled credential expressions after planning and excludes skipped Agent dependencies', async () => {
	const fixture = looseAgentsFixture();
	const credential = {
		id: 'model-credential',
		name: 'Model',
		type: 'openAiApi',
		data: { apiKey: '={{ $env.OPENAI_API_KEY }}' },
		dataIsComplete: true,
	};
	const source = serializedAgentSchema.parse(fixture.files['agents/support/agent.json']);
	fixture.files['agents/support/agent.json'] = {
		...source,
		tools: {},
		config: {
			...source.config,
			model: 'openai/gpt-4.1-mini',
			credential: credential.id,
			tools: [],
		},
	};
	fixture.manifest.credentials = [
		{ id: credential.id, name: credential.name, target: 'credentials/model' },
		{ id: 'skipped-credential', name: 'Skipped', target: 'credentials/skipped' },
	];
	fixture.manifest.requirements = {
		credentials: [
			{
				id: credential.id,
				name: credential.name,
				type: credential.type,
				usedBy: [{ kind: 'agent', id: 'support_source' }],
			},
			{
				id: 'skipped-credential',
				type: 'openAiApi',
				usedBy: [{ kind: 'agent', id: 'research_source' }],
			},
		],
		dataTables: [
			{
				id: 'skipped-table',
				name: 'Skipped table',
				usedBy: [{ kind: 'agent', id: 'research_source' }],
			},
		],
		variables: [{ name: 'SKIPPED_VARIABLE', usedBy: [{ kind: 'agent', id: 'research_source' }] }],
	};
	fixture.files['credentials/model/credential.json'] = credential;
	fixture.files['credentials/skipped/credential.json'] = { invalid: true };
	await agents.save({ id: 'research_source', name: 'Existing', projectId: project.id });
	const writer = new TarPackageWriter();
	await writeAgentPackageFixture(writer, fixture);
	const packageBuffer = await streamToBuffer(writer.finalize());
	const reader = new TarPackageReader(packageBuffer, new PackageImportConfig());
	const { result, scopes } = await Container.get(WorkflowPackageImporter).import(
		{
			...importPackageRequest({
				user,
				projectId: project.id,
				packageBuffer,
				conflictPolicy: 'skip',
				credentialMissingMode: 'create-with-values',
			}),
			folderConflictPolicy: 'merge',
		},
		reader,
		fixture.manifest,
	);

	expect(result.credentials).toEqual({
		matched: [],
		stubbed: [],
		seeded: [credential.id],
		incomplete: [],
		updated: [],
	});
	const stored = await Container.get(CredentialsRepository).findOneByOrFail({
		id: result.bindings.credentials[credential.id],
	});
	expect(
		await new Credentials({ id: stored.id, name: stored.name }, stored.type, stored.data).getData(),
	).toEqual(credential.data);
	expect(await Container.get(CredentialsRepository).count()).toBe(1);
	expect(scopes[0].credentialRequest.requirements?.map(({ id }) => id)).toEqual([credential.id]);
	expect(scopes[0].dataTableRequest.requirements).toEqual([]);
	expect(scopes[0].variableRequest.requirements).toEqual([]);
});

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
		...request.credentialRequest,
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
	expect(a.sourceAgentId).toBe(workflowId);
	expect(a.config?.subAgents?.agents?.[0].agentId).toBe(b.sourceAgentId);
	expect(b.config?.subAgents?.agents?.[0].agentId).toBe(a.sourceAgentId);
	expect(a.config?.tools?.[0]).toMatchObject({
		workflowId,
		inputs: first.config?.tools?.[0].type === 'workflow' ? first.config.tools[0].inputs : undefined,
	});
	expect(a.config?.credential).toBe(plan.credentialPlan.stubIds.get('model-credential'));
	expect(b.config?.credential).toBe(AI_GATEWAY_MANAGED_TAG);
	expect(a.skills).toEqual(first.skills);
	expect(a.tools).toEqual(first.tools);
	expect(a.config?.skills).toEqual(first.config?.skills);
	expect(a.tasks).toEqual(first.tasks);
	expect(a.config?.tasks).toEqual(first.config?.tasks);
	expect(request.agents).toEqual(original);
	expect(await records()).toEqual(before);
});

it.each<ImportConflictPolicy>(['new-version', 'skip', 'fail'])(
	'applies %s without resolving unused skipped definitions',
	async (policy) => {
		const existing = await agents.save({
			id: 'source',
			name: 'Existing',
			projectId: project.id,
		});
		const source = agent('source');
		if (policy === 'skip') source.config!.credential = 'unavailable';
		const request = input([source]);
		request.options.conflictPolicy = policy;
		request.credentialRequest.requirements = [
			{ id: 'unavailable', usedBy: [{ kind: 'agent', id: 'source' }] },
		];
		if (policy !== 'skip') request.credentialRequest.requirements = [];
		else {
			const member = await createMember();
			const role = await createCustomRoleWithScopeSlugs(['agent:import', 'agent:read'], {
				roleType: 'project',
			});
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
				sourceAgentId: existing.id,
			});
			expect(plan.credentialPlan.failures).toEqual([]);
			expect(plan.credentialPlan.stubIds.size).toBe(0);
			if (policy === 'skip') {
				expect(plan.agentPlan!.items[0].tasks).toEqual(source.tasks);
				await planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:import', 'agent:read'] });
			}
		}
	},
);

it('resolves dependency IDs and rejects missing references without writes', async () => {
	await agents.save({
		id: 'child-source',
		name: 'Child',
		projectId: project.id,
	});
	const workflow = await createWorkflow({ name: 'Lookup', nodes: [], connections: {} }, project);
	await Container.get(WorkflowRepository).update(workflow.id, {
		sourceWorkflowId: 'workflow-source',
	});
	const request = input([
		agent('parent', {
			subAgents: { agents: [{ agentId: 'child-source' }] },
			tools: [
				{ type: 'workflow', workflow: 'Lookup', workflowId: 'workflow-source' },
				{ type: 'workflow', workflow: 'Lookup', workflowId: workflow.id },
			],
		}),
	]);
	const before = await records();
	const plan = await planner.plan(request);
	expect(plan.blockingIssues).toEqual([]);
	expect(plan.agentPlan!.items[0].config).toMatchObject({
		subAgents: { agents: [{ agentId: 'child-source' }] },
		tools: [{ workflowId: workflow.id }, { workflowId: workflow.id }],
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
			...request.credentialRequest,
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

it('checks project boundaries after matching the whole package', async () => {
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

it.each<ImportConflictPolicy>(['new-version', 'skip'])(
	'checks task ownership across project plans under %s',
	async (policy) => {
		await agents.save({ id: 'first', name: 'First', projectId: project.id });
		const requests = [input([agent('first')]), input([agent('second')], otherProject.id)];
		requests[0].options.conflictPolicy = policy;
		for (const request of requests) {
			request.options.idPolicy = 'source';
			request.agents![0].tasks.task_shared = {
				name: 'Summary',
				objective: 'Summarize.',
				cronExpression: '0 9 * * *',
				timezone: null,
			};
			request.agents![0].config!.tasks = [{ type: 'task', id: 'task_shared', enabled: false }];
		}
		const plans = await planner.planPackage(requests);
		const issues = plans.flatMap((plan) => plan.blockingIssues);
		if (policy === 'skip') {
			expect(issues).toEqual([]);
			return;
		}
		expect(issues).toContainEqual(
			expect.objectContaining({
				type: 'agent-conflict',
				kind: 'task-id',
				sourceAgentId: 'second',
				sourceTaskId: 'task_shared',
				targetIds: ['first'],
			}),
		);
	},
);

it('blocks unavailable Agent tool node types without changing destination records', async () => {
	const source = agent('source', {
		tools: [
			{
				type: 'node',
				name: 'Missing tool',
				node: { nodeType: 'missing.node', nodeTypeVersion: 1, nodeParameters: {} },
			},
		],
	});
	const before = await records();
	const [plan] = await planner.planPackage([input([source])]);
	const issue = {
		type: 'missing-node-type',
		nodeType: 'missing.node',
		typeVersion: 1,
		usedBy: [{ kind: 'agent', id: 'source' }],
	};
	expect(plan.blockingIssues).toEqual([issue]);
	await expect(planner.assertNotBlocked([plan], { apiKeyScopes: undefined })).rejects.toMatchObject(
		{ httpStatusCode: 422, meta: { issues: [issue] } },
	);
	expect(await records()).toEqual(before);
});

it.each([
	['skills', /hard to tell apart|skill name/i],
	['self-reference', /itself/],
	['Teams connections', /only one Microsoft Teams connection/],
] as const)('uses the UI validation rule for %s', async (invalid, errorPattern) => {
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
	} else if (invalid === 'self-reference') {
		source.config!.subAgents = { agents: [{ agentId: 'source' }] };
	} else {
		source.config!.integrations = [
			{ type: 'teams', credentialId: 'teams-1' },
			{ type: 'teams', credentialId: 'teams-2' },
		];
	}
	const before = await records();
	const plan = await planner.plan(input([source]));
	expect(plan.blockingIssues).toContainEqual(
		expect.objectContaining({
			type: 'agent-invalid',
			message: expect.stringMatching(errorPattern),
		}),
	);
	expect(await records()).toEqual(before);
});

it.each(['create', 'update', 'publish', 'unpublish'] as const)(
	'requires the Agent %s action scope for project roles and API keys',
	async (action) => {
		const member = await createMember();
		const required = `agent:${action}`;
		const scopes = [
			'agent:import',
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
				id: 'source',
				name: 'Existing',
				projectId: project.id,
			});
			if (action === 'unpublish') {
				await Container.get(AgentHistoryRepository).saveVersion({
					agentId: 'source',
					versionId: 'published',
					schema: null,
					tools: {},
					publishedBy: 'Test',
				});
				await agents.update('source', { activeVersionId: 'published' });
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
		request.options.publishingPolicy = policies[action];
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

it.each(['existing', 'pending'] as const)(
	'checks credential stub permissions for Agents in %s projects',
	async (destination) => {
		const member = await createMember();
		const scopes = ['agent:import', 'agent:read', 'agent:create'];
		const role = await createCustomRoleWithScopeSlugs(scopes, { roleType: 'project' });
		await linkUserToProject(member, project, role.slug);
		const request = input(
			[agent('source', { model: 'openai/gpt-4.1-mini', credential: 'missing-credential' })],
			destination === 'pending' ? 'pending-project' : project.id,
		);
		request.context.user = member;
		request.projectPendingCreation = destination === 'pending';
		request.credentialRequest.missingMode = 'create-stub';
		request.credentialRequest.requirements = [
			{
				id: 'missing-credential',
				type: 'openAiApi',
				usedBy: [{ kind: 'agent', id: 'source' }],
			},
		];
		const before = await records();
		const plan = await planner.plan(request);
		expect(plan.blockingIssues).toEqual([]);

		if (destination === 'existing') {
			await expect(
				planner.assertNotBlocked([plan], { apiKeyScopes: undefined }),
			).rejects.toBeInstanceOf(ForbiddenError);
			const permittedRole = await createCustomRoleWithScopeSlugs([...scopes, 'credential:create'], {
				roleType: 'project',
			});
			await linkUserToProject(member, project, permittedRole.slug);
		}

		await expect(planner.assertNotBlocked([plan], { apiKeyScopes: scopes })).rejects.toBeInstanceOf(
			ForbiddenError,
		);
		await expect(
			planner.assertNotBlocked([plan], { apiKeyScopes: [...scopes, 'credential:create'] }),
		).resolves.toBeUndefined();
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
		planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:read', 'agent:create'] }),
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		planner.assertNotBlocked([plan], { apiKeyScopes: ['agent:import', 'agent:read'] }),
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		planner.assertNotBlocked([plan], {
			apiKeyScopes: ['agent:import', 'agent:read', 'agent:create'],
		}),
	).resolves.toBeUndefined();
	expect(await records()).toEqual(before);
});

it('evaluates normalized configuration and reports policy refusal without saving', async () => {
	const enforcement = Container.get(PolicyEnforcementService);
	const evaluateAgent = vi.spyOn(Container.get(AgentPolicyService), 'evaluateSave');
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
	const source = agent('source', {
		model: 'anthropic/claude-sonnet-4-5',
		config: { webSearch: { enabled: false } },
		providerTools: { 'anthropic.web_search': { maxUses: 5 } },
	});
	const normalizedConfig = { ...source.config, providerTools: {} };
	const plan = await planner.plan(input([source]));
	expect(plan.agentPlan?.items[0].config).toEqual(normalizedConfig);
	expect(evaluateAgent).toHaveBeenCalledWith(project.id, null, normalizedConfig, null);
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
