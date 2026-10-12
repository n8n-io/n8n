import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	ProjectRepository,
	ProjectRelationRepository,
	type Project,
	type User,
} from '@n8n/db';
import {
	PolicyCheck,
	PolicyCheckMetadata,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
	type WorkflowSaveContext,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ConflictError, ForbiddenError } from '@n8n/errors';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSaveCompletionService } from '@/modules/agents/agent-save-completion.service';
import { AgentSetupCompletionService } from '@/modules/agents/agent-setup-completion.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { createCredentials } from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import {
	looseAgentsFixture,
	projectAgentsFixture,
	writeAgentPackageFixture,
	type AgentPackageFixture,
} from './fixtures/agent-package-fixtures';
import { importPackageRequest } from './fixtures/import-request';
import { serializedWorkflow } from './fixtures/package-fixtures';
import { streamToBuffer } from './utils/tar-support';
import { ImportOrchestrator } from '../engine/import-orchestrator';
import { N8nPackageParser } from '../engine/n8n-package-parser';
import { ProjectPackageImporter } from '../engine/project-package-importer';
import { WorkflowPackageImporter } from '../engine/workflow-package-importer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { PackageImportConfig } from '../n8n-packages.config';
import type { ResolvedImportRequest } from '../n8n-packages.types';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';

let denySaves = false;
@PolicyCheck()
class AgentDefinitionSaveCheck implements RegisteredPolicyCheck {
	readonly id = 'test-agent-definition-save';
	async onWorkflowSave(context: WorkflowSaveContext): Promise<PolicyCheckResult> {
		return {
			violations:
				denySaves && context.workflow.artifactKind === 'agent'
					? [{ checkId: this.id, kind: 'test-agent-save-denied', message: 'Agent save is denied.' }]
					: [],
		};
	}
}

const license = new LicenseMocker();
mockInstance(ActiveWorkflowManager);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
const runtimes = mockInstance(AgentRuntimeCacheService);
const broadcaster = mockInstance(AgentUpdateBroadcaster);
let owner: User;
let project: Project;
let agents: AgentRepository;
let tasks: AgentTaskRepository;
let orchestrator: ImportOrchestrator;

beforeAll(async () => {
	await testModules.loadModules(['agents', 'n8n-packages']);
	await testDb.init();
	license.mockLicenseState(Container.get(LicenseState));
	license.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(AgentDefinitionSaveCheck);
	Container.get(PolicyEnforcementService).setImplementation(Container.get(PolicyDecisionService));
	agents = Container.get(AgentRepository);
	tasks = Container.get(AgentTaskRepository);
	orchestrator = Container.get(ImportOrchestrator);
	owner = await createOwner();
	project = await createTeamProject('Destination', owner);
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
	denySaves = false;
	license.reset();
	vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => await testDb.terminate());

function source(fixture: AgentPackageFixture, index = 0) {
	const file = `${fixture.manifest.agents[index].target}/agent.json`;
	const agent = serializedAgentSchema.parse(fixture.files[file]);
	fixture.files[file] = agent;
	return agent;
}

function fixture(wholeProject = false) {
	const result = wholeProject ? projectAgentsFixture() : looseAgentsFixture();
	delete result.manifest.requirements;
	for (const [index] of result.manifest.agents.entries()) {
		for (const [id, tool] of Object.entries(source(result, index).tools)) tool.descriptor.name = id;
	}
	return result;
}

async function readerFor(input: AgentPackageFixture) {
	const writer = new TarPackageWriter();
	await writeAgentPackageFixture(writer, input);
	return new TarPackageReader(await streamToBuffer(writer.finalize()), new PackageImportConfig());
}

function request(overrides: Partial<ResolvedImportRequest> = {}): ResolvedImportRequest {
	return {
		...importPackageRequest({
			user: owner,
			packageBuffer: Buffer.alloc(0),
			projectId: project.id,
			workflowConflictPolicy: 'new-version',
			folderConflictPolicy: 'merge',
		}),
		folderConflictPolicy: 'merge',
		...overrides,
	};
}

async function importSelected(
	input: AgentPackageFixture,
	overrides: Partial<ResolvedImportRequest> = {},
) {
	return await Container.get(WorkflowPackageImporter).import(
		request(overrides),
		await readerFor(input),
		input.manifest,
	);
}

async function planFor(input: AgentPackageFixture, overrides: Partial<ResolvedImportRequest> = {}) {
	const reader = await readerFor(input);
	const parser = Container.get(N8nPackageParser);
	const options = request(overrides);
	return await orchestrator.plan({
		context: { user: options.user, projectId: options.projectId!, folderId: null },
		agents: await parser.getAgents(reader),
		folders: [],
		workflows: await parser.getWorkflows(reader),
		options,
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
	});
}

it('applies selected Agents with complete bodies, cycles, workflow bindings and credentials', async () => {
	const input = fixture();
	const first = source(input);
	const second = source(input, 1);
	first.config!.model = 'openai/gpt-4.1-mini';
	first.config!.credential = 'source-model';
	first.config!.subAgents = { agents: [{ agentId: second.id }] };
	first.config!.integrations = [{ type: 'slack', credentialId: 'source-chat' }];
	first.config!.tools!.push({ type: 'workflow', workflowId: first.id, workflow: 'Lookup' });
	second.config!.model = 'openai/gpt-4.1-mini';
	second.config!.credential = AI_GATEWAY_MANAGED_TAG;
	second.config!.subAgents = { agents: [{ agentId: first.id }] };
	input.manifest.workflows = [{ id: first.id, name: 'Lookup', target: 'workflows/lookup' }];
	input.files['workflows/lookup/workflow.json'] = serializedWorkflow({
		id: first.id,
		name: 'Lookup',
		nodes: [],
	});
	input.files['workflows/lookup/workflow-metadata.json'] = {
		versionId: 'source-workflow-version',
		publishedVersionId: null,
	};
	input.manifest.requirements = {
		credentials: [
			{ id: 'source-model', usedBy: [{ kind: 'agent', id: first.id }] },
			{
				id: 'source-chat',
				type: 'slackApi',
				name: 'Chat',
				usedBy: [{ kind: 'agent', id: first.id }],
			},
		],
	};
	const credential = await createCredentials(
		{ name: 'Model', type: 'openAiApi', data: '' },
		project,
	);
	const completion = Container.get(AgentSaveCompletionService);
	const configurationSaved = completion.configurationSaved.bind(completion);
	const observed = vi
		.spyOn(completion, 'configurationSaved')
		.mockImplementation(async (event, ...args) => {
			expect(await agents.findById(event.agent.id)).toMatchObject({
				sourceAgentId: event.agent.sourceAgentId,
				schema: event.agent.schema,
			});
			expect(await tasks.findByAgentId(event.agent.id)).toHaveLength(1);
			await configurationSaved(event, ...args);
		});
	const connect = vi.spyOn(Container.get(ChatIntegrationService), 'connect');
	const schedule = vi.spyOn(Container.get(AgentTaskService), 'registerEnabledForAgent');
	const original = structuredClone(input);
	const imported = await importSelected(input, {
		bindings: { credentials: new Map([['source-model', credential.id]]) },
		credentialMissingMode: 'create-stub',
	});
	const outcomes = imported.scopes[0].imported.agentOutcomes;
	expect(outcomes.map(({ status }) => status)).toEqual(['created', 'created']);
	const [saved, child] = outcomes.map(({ agent }) => agent);
	const workflow = imported.scopes[0].imported.workflowOutcomes[0].workflow;
	expect(saved.id).not.toBe(workflow.id);
	expect(saved).toMatchObject({
		sourceAgentId: first.id,
		skills: first.skills,
		tools: first.tools,
		availableInMCP: true,
		activeVersionId: null,
	});
	expect(saved.versionId).not.toBe('draft-version');
	expect(saved.schema).toMatchObject({
		credential: credential.id,
		subAgents: { agents: [{ agentId: child.id }] },
		tools: expect.arrayContaining([expect.objectContaining({ workflowId: workflow.id })]),
	});
	expect(child.schema).toMatchObject({
		credential: AI_GATEWAY_MANAGED_TAG,
		subAgents: { agents: [{ agentId: saved.id }] },
	});
	const [savedTask] = await tasks.findByAgentId(saved.id);
	expect(savedTask).toMatchObject({
		sourceTaskId: `${first.id}_task`,
		...first.tasks[`${first.id}_task`],
	});
	expect(saved.schema!.tasks![0].id).toBe(savedTask.id);
	expect(await Container.get(CredentialsRepository).findOneBy({ id: 'source-chat' })).toMatchObject(
		{ type: 'slackApi' },
	);
	expect(saved.integrations).toEqual([{ type: 'slack', credentialId: 'source-chat' }]);
	expect(await Container.get(AgentHistoryRepository).count()).toBe(0);
	expect(observed).toHaveBeenCalledTimes(2);
	expect(runtimes.clearRuntimes).toHaveBeenCalledWith(saved.id);
	expect(broadcaster.notify).toHaveBeenCalled();
	expect(connect).not.toHaveBeenCalled();
	expect(schedule).not.toHaveBeenCalled();
	expect(input).toEqual(original);
});

it('reuses destination IDs, replaces removed content, skips writes and preserves null configurations', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const first = source(input);
	const initial = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	const [task] = await tasks.findByAgentId(initial.id);
	const history = Container.get(AgentHistoryRepository);
	await history.saveVersion({
		agentId: initial.id,
		versionId: initial.versionId!,
		schema: initial.schema,
		skills: initial.skills,
		tools: initial.tools,
		publishedBy: 'Test',
	});
	await agents.update(initial.id, { activeVersionId: initial.versionId });
	await tasks.insert({
		id: 'destination-only-task',
		agentId: initial.id,
		name: 'Remove',
		objective: '',
		cronExpression: '0 8 * * *',
	});
	first.skills = {};
	first.tools = {};
	first.config!.skills = [];
	first.config!.tools = [];
	delete first.config!.mcpServers;
	first.tasks[`${first.id}_task`].objective = 'Updated objective';
	first.availableInMCP = false;
	const schedule = vi.spyOn(Container.get(AgentTaskService), 'registerEnabledForAgent');
	const updated = (await importSelected(input)).scopes[0].imported.agentOutcomes[0];
	expect(updated).toMatchObject({
		status: 'updated',
		agent: {
			id: initial.id,
			activeVersionId: initial.versionId,
			skills: {},
			tools: {},
			availableInMCP: false,
		},
	});
	expect(updated.agent.versionId).not.toBe(initial.versionId);
	expect(updated.agent.schema).not.toHaveProperty('mcpServers');
	expect(await tasks.findByAgentId(initial.id)).toMatchObject([
		{ id: task.id, sourceTaskId: `${first.id}_task`, objective: 'Updated objective' },
	]);
	expect(await tasks.count()).toBe(1);
	expect(await history.count()).toBe(1);
	expect(schedule).not.toHaveBeenCalled();
	const before = await agents.findById(initial.id);
	const completion = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
	first.config!.instructions = 'Ignored';
	const skipped = (await importSelected(input, { workflowConflictPolicy: 'skip' })).scopes[0]
		.imported.agentOutcomes;
	expect(skipped).toMatchObject([{ status: 'skipped', agent: { id: initial.id } }]);
	expect(await agents.findById(initial.id)).toEqual(before);
	expect(completion).not.toHaveBeenCalled();
	first.config = null;
	first.tasks = {};
	await importSelected(input);
	expect(await agents.findById(initial.id)).toMatchObject({
		schema: null,
		integrations: [],
		skills: {},
		tools: {},
		activeVersionId: initial.versionId,
	});
	expect(await tasks.findByAgentId(initial.id)).toEqual([]);
});

it('completes a committed update when the setup check fails', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const initial = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	source(input).config!.instructions = 'Updated instructions';
	vi.clearAllMocks();
	vi.spyOn(
		Container.get(AgentSetupCompletionService),
		'recordIfSetupComplete',
	).mockRejectedValueOnce(new Error('Setup check is unavailable'));
	await importSelected(input);
	expect(await agents.findById(initial.id)).toMatchObject({
		schema: { instructions: 'Updated instructions' },
	});
	expect(runtimes.clearRuntimes).toHaveBeenCalledWith(initial.id);
	expect(broadcaster.notify).toHaveBeenCalledWith(
		expect.objectContaining({ agentId: initial.id }),
		undefined,
	);
});

it('applies a project package after authorized project creation', async () => {
	const input = fixture(true);
	const role = await createCustomRoleWithScopeSlugs(['project:create'], { roleType: 'global' });
	const user = await createUser({ role });
	const result = await Container.get(ProjectPackageImporter).import(
		request({ user, projectId: undefined }),
		await readerFor(input),
		input.manifest,
		'package-import',
	);
	expect(await Container.get(ProjectRepository).findOneBy({ id: 'project_source' })).toMatchObject({
		type: 'team',
	});
	expect(
		await Container.get(ProjectRelationRepository).findOne({
			where: { userId: user.id, projectId: 'project_source' },
			relations: ['role'],
		}),
	).toMatchObject({ role: { slug: 'project:admin' } });
	expect(result.scopes[0].imported.agentOutcomes).toHaveLength(2);
	expect(await agents.findByProjectId('project_source')).toHaveLength(2);
	expect(result.scopes[0].imported.workflowOutcomes).toHaveLength(1);
});

it.each(['create', 'update'] as const)(
	'rolls back the current %s after a task write fails, and keeps earlier saves',
	async (action) => {
		const input = fixture();
		const options = { workflowIdPolicy: 'source' } as const;
		if (action === 'update') {
			await importSelected(input, options);
			await agents.update('research_source', { sourceAgentId: null });
			await tasks.update({ agentId: 'research_source' }, { sourceTaskId: null });
		}
		const first = source(input);
		const second = source(input, 1);
		first.config!.instructions = 'Keep this earlier save.';
		second.config!.instructions = 'Roll back this save.';
		second.tasks.research_source_task.objective = 'Changed objective';
		second.availableInMCP = true;
		const plan = await planFor(input, options);
		expect(plan.blockingIssues).toEqual([]);
		const beforeAgent = await agents.findById('research_source');
		const beforeTasks = await tasks.findByAgentId('research_source');
		const original = structuredClone(plan.agentPlan);
		const replace = tasks.replaceForAgent.bind(tasks);
		vi.spyOn(tasks, 'replaceForAgent').mockImplementation(async (...args) => {
			const changed = await replace(...args);
			if (args[0] === 'research_source') throw new Error('Task write failed');
			return changed;
		});
		const effects = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
		await expect(orchestrator.apply(plan)).rejects.toThrow('Task write failed');
		expect(await agents.findById('research_source')).toEqual(beforeAgent);
		expect(await tasks.findByAgentId('research_source')).toEqual(beforeTasks);
		expect(await agents.findById('support_source')).toMatchObject({
			schema: { instructions: 'Keep this earlier save.' },
		});
		expect(effects.mock.calls.map(([event]) => event.agent.id)).toEqual(['support_source']);
		expect(plan.agentPlan).toEqual(original);
	},
);

it.each(['draft', 'publication'] as const)(
	'rejects a plan made before a concurrent %s change',
	async (change) => {
		const input = fixture();
		input.manifest.agents.splice(1);
		const saved = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
		const plan = await planFor(input);
		const current = (await agents.findById(saved.id))!;
		if (change === 'draft') {
			current.name = 'Concurrent name';
			await agents.saveDraftFenced(current);
		} else {
			await Container.get(AgentHistoryRepository).saveVersion({
				agentId: saved.id,
				versionId: saved.versionId!,
				schema: saved.schema,
				skills: saved.skills,
				tools: saved.tools,
				publishedBy: 'Test',
			});
			await agents.setActiveVersionFenced(saved.id, current.revision, {
				activeVersionId: saved.versionId,
				versionId: saved.versionId!,
			});
		}
		const before = await agents.findById(saved.id);
		const effects = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
		await expect(orchestrator.apply(plan)).rejects.toBeInstanceOf(ConflictError);
		expect(await agents.findById(saved.id)).toEqual(before);
		expect(effects).not.toHaveBeenCalled();
	},
);

it('keeps strict creation when a planned ID becomes occupied', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const plan = await planFor(input);
	const id = plan.agentPlan!.items[0].targetAgentId;
	await agents.save({ id, name: 'Concurrent Agent', projectId: project.id });
	const before = await agents.findById(id);
	await expect(orchestrator.apply(plan)).rejects.toBeInstanceOf(ConflictError);
	expect(await agents.findById(id)).toEqual(before);
	expect(await tasks.findByAgentId(id)).toEqual([]);
});

it.each(['create', 'update'] as const)(
	'rechecks the %s project role before applying a plan',
	async (action) => {
		const input = fixture();
		input.manifest.agents.splice(1);
		if (action === 'update') await importSelected(input);
		const member = await createMember();
		const allowed = await createCustomRoleWithScopeSlugs(
			['agent:read', 'agent:create', 'agent:update', 'workflow:import'],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, allowed.slug);
		const plan = await planFor(input, { user: member });
		const denied = await createCustomRoleWithScopeSlugs(['agent:read', 'workflow:import'], {
			roleType: 'project',
		});
		await linkUserToProject(member, project, denied.slug);
		const before = await agents.findByProjectId(project.id);
		await expect(orchestrator.apply(plan)).rejects.toBeInstanceOf(ForbiddenError);
		expect(await agents.findByProjectId(project.id)).toEqual(before);
	},
);

it.each(['skill', 'body', 'task', 'credential', 'policy'] as const)(
	'runs the save-time %s check before any definition write',
	async (failure) => {
		const input = fixture();
		input.manifest.agents.splice(1);
		const plan = await planFor(input);
		const item = plan.agentPlan!.items[0];
		if (failure === 'skill')
			item.skills.duplicate = {
				...item.skills['shared-skill'],
				name: item.skills['shared-skill'].name.toUpperCase(),
			};
		else if (failure === 'body') item.skills = {};
		else if (failure === 'task')
			item.tasks[Object.keys(item.tasks)[0]].cronExpression = 'invalid cron';
		else if (failure === 'credential') {
			item.config!.model = 'openai/gpt-4.1-mini';
			item.config!.credential = 'unavailable';
		} else denySaves = true;
		const effects = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
		const apply = orchestrator.apply(plan);
		if (failure === 'policy') await expect(apply).rejects.toBeInstanceOf(PolicyViolationError);
		else
			await expect(apply).rejects.toThrow(
				/skill name|without a body|cron|missing or inaccessible/i,
			);
		expect(await agents.findByProjectId(project.id)).toEqual([]);
		expect(await tasks.count()).toBe(0);
		expect(effects).not.toHaveBeenCalled();
	},
);
