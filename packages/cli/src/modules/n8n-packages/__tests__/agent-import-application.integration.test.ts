import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
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
	type WorkflowPublishContext,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSaveCompletionService } from '@/modules/agents/agent-save-completion.service';
import { AgentSetupCompletionService } from '@/modules/agents/agent-setup-completion.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { registerSkillAgentsProvider } from '@/modules/agents/register-skill-agents-provider';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/skills/skill.repository';
import { toSkillContent } from '@/modules/skills/skill.service';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';
import { createCredentials } from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

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
let deniedPublishName: string | undefined;
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
	async onWorkflowPublish(context: WorkflowPublishContext): Promise<PolicyCheckResult> {
		return {
			violations:
				context.workflow.artifactKind === 'agent' && context.workflow.name === deniedPublishName
					? [
							{
								checkId: this.id,
								kind: 'test-agent-publish-denied',
								message: 'Agent publication is denied.',
							},
						]
					: [],
		};
	}
}

const license = new LicenseMocker();
mockInstance(ActiveWorkflowManager);
mockInstance(Telemetry);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
const runtimes = mockInstance(AgentRuntimeCacheService);
const broadcaster = mockInstance(AgentUpdateBroadcaster);
const telemetry = mockInstance(Telemetry);
let owner: User;
let project: Project;
let agents: AgentRepository;
let tasks: AgentTaskRepository;
let orchestrator: ImportOrchestrator;

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents', 'n8n-packages']);
	await testDb.init();
	registerSkillAgentsProvider();
	await initNodeTypes({
		'n8n-nodes-base.executeWorkflowTrigger': { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	});
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
	// Skills belong to projects and outlive their agents.
	await Container.get(SkillRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
	]);
	denySaves = false;
	deniedPublishName = undefined;
	license.reset();
	vi.clearAllMocks();
	vi.spyOn(Container.get(AiGatewayService), 'getCredentialTypeForProviderCached').mockReturnValue(
		'openAiApi',
	);
	vi.spyOn(Container.get(AgentTaskService), 'requestReconcile').mockResolvedValue();
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

function publishableFixture(wholeProject = false) {
	const input = fixture(wholeProject);
	for (const [index, entry] of input.manifest.agents.entries()) {
		const config = source(input, index).config!;
		Object.assign(config, {
			model: 'openai/gpt-4.1-mini',
			credential: AI_GATEWAY_MANAGED_TAG,
			instructions: 'Help with requests.',
			mcpServers: [],
		});
		config.tools![0].enabled = true;
		config.tasks![0].enabled = true;
		input.files[`${entry.target}/agent-metadata.json`] = {
			versionId: 'draft-version',
			publishedVersionId: 'draft-version',
		};
	}
	return input;
}

function addWorkflowTool(input: AgentPackageFixture) {
	const agent = source(input);
	const entry = { id: agent.id, name: 'Lookup', target: 'workflows/lookup', isArchived: false };
	input.manifest.workflows = [entry];
	input.files[`${entry.target}/workflow.json`] = serializedWorkflow({
		id: entry.id,
		name: entry.name,
		nodes: ['executeWorkflowTrigger', 'scheduleTrigger'].map((type) => ({
			id: type,
			name: type,
			type: `n8n-nodes-base.${type}`,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		})),
	});
	input.files[`${entry.target}/workflow-metadata.json`] = {
		versionId: 'source-workflow-version',
		publishedVersionId: null,
	};
	agent.config!.tools!.push({ type: 'workflow', workflowId: entry.id, workflow: entry.name });
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
			conflictPolicy: 'new-version',
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
		credentialRequest: {
			requirements: [],
			matchingMode: 'id-only',
			missingMode: 'must-preexist',
			conflictPolicy: 'keep-existing',
			updateScope: { projectIds: new Set([options.projectId!]) },
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
	});
}

it('applies selected Agents with complete bodies, cycles, workflow bindings and credentials', async () => {
	vi.spyOn(Container.get(AiGatewayService), 'getCredentialTypeForProviderCached').mockReturnValue(
		'openAiApi',
	);
	const input = fixture();
	const first = source(input);
	const second = source(input, 1);
	for (const agent of [first, second]) {
		agent.config!.instructions = 'Help with requests.';
		agent.config!.mcpServers![0].url = 'https://example.com/mcp';
	}
	first.config!.model = 'openai/gpt-4.1-mini';
	first.config!.credential = 'source-model';
	first.config!.subAgents = { agents: [{ agentId: second.id }] };
	first.config!.integrations = [{ type: 'slack', credentialId: 'source-chat' }];
	first.config!.tools!.push({
		type: 'workflow',
		workflowId: first.id,
		workflow: 'Lookup',
		enabled: false,
	});
	second.config!.model = 'openai/gpt-4.1-mini';
	second.config!.credential = AI_GATEWAY_MANAGED_TAG;
	second.config!.subAgents = { agents: [{ agentId: first.id }] };
	input.manifest.workflows = [
		{ id: first.id, name: 'Lookup', target: 'workflows/lookup', isArchived: false },
	];
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
	const definitionSaved = completion.definitionSaved.bind(completion);
	const observed = vi
		.spyOn(completion, 'definitionSaved')
		.mockImplementation(async (event, ...args) => {
			expect(await agents.findById(event.agent.id)).toMatchObject({
				id: event.agent.id,
				schema: event.agent.schema,
			});
			expect(await tasks.findByAgentId(event.agent.id)).toHaveLength(1);
			await definitionSaved(event, ...args);
		});
	const connect = vi.spyOn(Container.get(ChatIntegrationService), 'connect');
	const schedule = vi.spyOn(Container.get(AgentTaskService), 'registerEnabledForAgent');
	vi.spyOn(Container.get(UrlService), 'getInstanceBaseUrl').mockReturnValue(
		'https://example.com/n8n',
	);
	const original = structuredClone(input);
	const imported = await importSelected(input, {
		bindings: { credentials: new Map([['source-model', credential.id]]) },
		credentialMissingMode: 'create-stub',
	});
	const outcomes = imported.scopes[0].imported.agentOutcomes;
	expect(outcomes.map(({ status }) => status)).toEqual(['created', 'created']);
	const [saved, child] = outcomes.map(({ agent }) => agent);
	const workflow = imported.scopes[0].imported.workflowOutcomes[0].workflow;
	expect(saved.id).toBe(workflow.id);
	expect(saved).toMatchObject({
		id: first.id,
		tools: first.tools,
		availableInMCP: true,
		activeVersionId: null,
	});
	const importedSkills = await Container.get(AgentSkillRefsService).readDraft(saved, {});
	expect(importedSkills.skillRefs).toEqual(first.config!.skills);
	expect(Object.values(importedSkills.skills)).toEqual(
		Object.values(first.skills).map(({ allowedTools: _allowedTools, ...body }) => body),
	);
	const childSkills = await Container.get(AgentSkillRefsService).readDraft(child, {});
	expect(childSkills.skillRefs).toEqual(second.config!.skills);
	expect(Object.values(childSkills.skills)).toEqual(
		Object.values(second.skills).map(({ allowedTools: _allowedTools, ...body }) => body),
	);
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
		id: `${first.id}_task`,
		...first.tasks[`${first.id}_task`],
	});
	expect(saved.schema!.tasks![0].id).toBe(savedTask.id);
	// A channel credential never connects an imported channel, so the import does not stub it.
	expect(await Container.get(CredentialsRepository).findOneBy({ id: 'source-chat' })).toBeNull();
	expect(saved.integrations).toEqual([{ type: 'slack', credentialId: '' }]);
	expect(outcomes[0]).toMatchObject({
		blockedFromPublish: 'channel-setup-required',
		channels: [
			{
				type: 'slack',
				status: 'setup-required',
				reason: 'new-channel',
				setupUrl: `https://example.com/n8n/projects/${project.id}/agents/${first.id}`,
			},
		],
	});
	expect(await Container.get(AgentHistoryRepository).count()).toBe(2);
	expect(observed).toHaveBeenCalledTimes(2);
	expect(runtimes.clearRuntimes).not.toHaveBeenCalled();
	expect(broadcaster.notify).toHaveBeenCalled();
	expect(connect).not.toHaveBeenCalled();
	expect(schedule).not.toHaveBeenCalled();
	const setupCompleted = telemetry.track.mock.calls.filter(([event]) =>
		Object.is(event, TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED),
	);
	// The channel of the first Agent still needs setup, so only the child is complete.
	expect(setupCompleted).toEqual([
		[
			TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED,
			expect.objectContaining({ agent_id: child.id, project_id: project.id, user_id: owner.id }),
		],
	]);
	expect(await agents.findById(saved.id)).toMatchObject({ setupCompletedAt: null });
	expect(await agents.findById(child.id)).toMatchObject({ setupCompletedAt: expect.any(Date) });
	for (const agent of [saved, child]) {
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
			expect.objectContaining({ agent_id: agent.id, event_version: '3' }),
		);
	}
	expect(input).toEqual(original);
});

it.each(['project', 'instance'] as const)(
	'rejects a skill ID owned by another %s without replacing its content',
	async (scope) => {
		const input = fixture();
		input.manifest.agents.splice(1);
		const elsewhere = await createTeamProject('Elsewhere', owner);
		const body = {
			name: 'Existing skill',
			description: 'Keep this skill.',
			instructions: 'Keep these instructions.',
		};
		const repository = Container.get(SkillRepository);
		await repository.createSkill(
			{
				id: 'support_source_skill',
				target: { projectId: scope === 'project' ? elsewhere.id : null },
				source: 'ui',
				createdById: owner.id,
			},
			toSkillContent(body),
		);
		const before = await repository.findLatestSaved(['support_source_skill']);
		await expect(importSelected(input)).rejects.toBeInstanceOf(ConflictError);
		expect(await repository.findLatestSaved(['support_source_skill'])).toEqual(before);
		expect(await agents.findById('support_source')).toBeNull();
		await repository.deleteSkill('support_source_skill');
	},
);

it('reuses destination IDs, replaces removed content, skips writes and preserves null configurations', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const first = source(input);
	const initial = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	telemetry.track.mockClear();
	const [task] = await tasks.findByAgentId(initial.id);
	const history = Container.get(AgentHistoryRepository);
	const skillRefs = Container.get(AgentSkillRefsService);
	const initialSkills = await skillRefs.readDraft(initial, {});
	await agents.update(initial.id, { activeVersionId: initial.versionId });
	first.skills.support_source_skill.instructions = 'Promoted skill instructions';
	first.skills.support_source_skill.references = [];
	first.tasks[`${first.id}_task`].objective = 'Promoted task objective';
	const promoted = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	expect(await agents.findById(initial.id)).toMatchObject({
		versionId: promoted.versionId,
		revision: initial.revision + 1,
	});
	expect(await history.count()).toBe(2);
	expect(
		await Container.get(AgentTaskSnapshotRepository).findByVersionId(promoted.versionId!),
	).toMatchObject([{ taskId: task.id, objective: 'Promoted task objective' }]);
	const promotedSkills = await skillRefs.readDraft(initial, {});
	expect(promotedSkills.skillRefs).toEqual(initialSkills.skillRefs);
	expect(promotedSkills.skills.support_source_skill.instructions).toBe(
		'Promoted skill instructions',
	);
	expect(promotedSkills.skills.support_source_skill).not.toHaveProperty('references');
	expect(await skillRefs.readVersion({ versionId: initial.versionId! }, {})).toEqual(initialSkills);
	await importSelected(input);
	expect(
		await Container.get(SkillRepository).findLatestSummaries(['support_source_skill']),
	).toEqual(new Map([['support_source_skill', expect.objectContaining({ version: 2 })]]));
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
			tools: {},
			availableInMCP: false,
		},
	});
	expect(updated.agent.versionId).not.toBe(initial.versionId);
	expect(telemetry.track).toHaveBeenCalledWith(
		TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
		expect.objectContaining({ agent_id: initial.id, event_version: '2' }),
	);
	expect(telemetry.track).not.toHaveBeenCalledWith(
		TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
		expect.anything(),
	);
	expect(updated.agent.schema).not.toHaveProperty('mcpServers');
	expect(await Container.get(AgentSkillRefsService).readDraft(updated.agent, {})).toEqual({
		skillRefs: [],
		skills: {},
	});
	expect(await tasks.findByAgentId(initial.id)).toMatchObject([
		{ id: task.id, objective: 'Updated objective' },
	]);
	expect(await tasks.count()).toBe(1);
	expect(await history.count()).toBe(4);
	expect(await skillRefs.readVersion({ versionId: initial.versionId! }, {})).toEqual(initialSkills);
	expect(schedule).not.toHaveBeenCalled();
	const before = await agents.findById(initial.id);
	const completion = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
	first.config!.instructions = 'Ignored';
	const skipped = (await importSelected(input, { conflictPolicy: 'skip' })).scopes[0].imported
		.agentOutcomes;
	expect(skipped).toMatchObject([{ status: 'skipped', agent: { id: initial.id } }]);
	expect(await agents.findById(initial.id)).toEqual(before);
	expect(completion).not.toHaveBeenCalled();
	first.config = null;
	first.tasks = {};
	await importSelected(input);
	expect(await agents.findById(initial.id)).toMatchObject({
		schema: null,
		integrations: [],
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
	const setupCheck = vi
		.spyOn(Container.get(AgentSetupCompletionService), 'recordIfSetupComplete')
		.mockRejectedValueOnce(new Error('Setup check is unavailable'));
	await importSelected(input);
	expect(setupCheck.mock.calls[0]?.[0]).toMatchObject({
		id: initial.id,
		schema: { instructions: 'Updated instructions' },
	});
	expect(await agents.findById(initial.id)).toMatchObject({
		schema: { instructions: 'Updated instructions' },
	});
	expect(runtimes.clearRuntimes).toHaveBeenCalledWith(initial.id);
	expect(broadcaster.notify).toHaveBeenCalledWith(
		expect.objectContaining({ agentId: initial.id }),
		undefined,
	);
});

it('applies and publishes a project package after authorized project creation', async () => {
	const input = publishableFixture(true);
	const role = await createCustomRoleWithScopeSlugs(['project:create'], { roleType: 'global' });
	const user = await createUser({ role });
	const result = await Container.get(ProjectPackageImporter).import(
		request({
			user,
			projectId: undefined,
			publishingPolicy: 'match-source',
		}),
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
	expect(result.agentOutcomes.map(({ publishing }) => publishing)).toEqual([
		{ state: 'published' },
		{ state: 'published' },
	]);
	expect(await Container.get(AgentHistoryRepository).count()).toBe(2);
});

it('publishes workflows before an Agent cycle and snapshots the committed definitions', async () => {
	const input = publishableFixture();
	addWorkflowTool(input);
	const first = source(input);
	const second = source(input, 1);
	first.config!.subAgents = { agents: [{ agentId: second.id }] };
	second.config!.subAgents = { agents: [{ agentId: first.id }] };
	const snapshots = Container.get(AgentTaskSnapshotRepository);
	const reconciledTasks = new Map<string, string[]>();
	vi.spyOn(Container.get(AgentTaskService), 'requestReconcile').mockImplementation(async (id) => {
		const saved = await agents.findById(id);
		const published = saved?.activeVersionId
			? await snapshots.findByVersionId(saved.activeVersionId)
			: [];
		reconciledTasks.set(
			id,
			published.map(({ taskId }) => taskId),
		);
	});
	const imported = await importSelected(input, {
		publishingPolicy: 'publish-all',
	});
	expect(imported.result.workflows[0].publishing).toEqual({ state: 'published' });
	for (const [index, outcome] of imported.agentOutcomes.entries()) {
		const applied = imported.scopes[0].imported.agentOutcomes[index].agent;
		expect(outcome).toMatchObject({ status: 'created', publishing: { state: 'published' } });
		expect(applied.activeVersionId).toBeNull();
		expect(outcome.agent.activeVersionId).toBe(applied.versionId);
		expect(outcome.agent.revision).toBe(applied.revision);
		expect(outcome.agent.publicationRevision).toBe(applied.publicationRevision + 1);
		expect(
			await Container.get(AgentHistoryRepository).findByVersionAndAgentId(
				applied.versionId!,
				applied.id,
			),
		).toMatchObject({
			tools: applied.tools,
			publishedById: owner.id,
			schema: { credential: AI_GATEWAY_MANAGED_TAG, subAgents: applied.schema!.subAgents },
		});
		const skillRefs = Container.get(AgentSkillRefsService);
		expect(await skillRefs.readVersion({ versionId: applied.versionId! }, {})).toEqual(
			await skillRefs.readDraft(applied, {}),
		);
		const [task] = await tasks.findByAgentId(applied.id);
		expect(reconciledTasks.get(applied.id)).toEqual([task.id]);
		expect(await snapshots.findByVersionId(applied.versionId!)).toMatchObject([
			{
				taskId: task.id,
				enabled: true,
				name: task.name,
				objective: task.objective,
				cronExpression: task.cronExpression,
				timezone: task.timezone,
			},
		]);
	}
	expect(reconciledTasks.size).toBe(2);
	vi.spyOn(Container.get(WorkflowService), 'activateWorkflow').mockRejectedValueOnce(
		new Error('Workflow publication failed'),
	);
	const updated = await importSelected(input, {
		publishingPolicy: 'publish-all',
	});
	expect(updated.result.workflows[0].publishing.state).toBe('failed');
	expect(updated.agentOutcomes.map(({ publishing }) => publishing)).toEqual([
		{ state: 'published' },
		{ state: 'published' },
	]);
});

it('keeps source version semantics and skips publication for skipped Agents', async () => {
	const input = publishableFixture();
	input.manifest.agents.splice(1);
	const initial = await importSelected(input);
	expect(initial.agentOutcomes[0].publishing).toEqual({ state: 'unchanged' });
	const matched = await importSelected(input, {
		publishingPolicy: 'match-source',
	});
	expect(matched.agentOutcomes[0].publishing).toEqual({ state: 'published' });
	const republished = await importSelected(input);
	expect(republished.agentOutcomes[0].publishing).toEqual({ state: 'published' });
	const published = republished.agentOutcomes[0].agent;
	input.files[`${input.manifest.agents[0].target}/agent-metadata.json`] = {
		versionId: 'selected-draft',
		publishedVersionId: 'absent-published-version',
	};
	for (const policy of ['preserve-published-state', 'match-source'] as const) {
		const result = await importSelected(input, {
			publishingPolicy: policy,
		});
		expect(result.agentOutcomes[0]).toMatchObject({
			status: 'updated',
			agent: { activeVersionId: published.activeVersionId },
			publishing: { state: 'unchanged' },
		});
	}
	const before = await agents.findById(published.id);
	const skipped = await importSelected(input, {
		conflictPolicy: 'skip',
		publishingPolicy: 'unpublish-all',
	});
	expect(skipped.agentOutcomes[0]).toMatchObject({
		status: 'skipped',
		publishing: { state: 'unchanged' },
	});
	expect(await agents.findById(published.id)).toEqual(before);
	expect(await Container.get(AgentHistoryRepository).count()).toBe(5);
	expect(Container.get(AgentTaskService).requestReconcile).toHaveBeenCalledTimes(2);
	input.files[`${input.manifest.agents[0].target}/agent-metadata.json`] = {
		versionId: 'draft-version',
		publishedVersionId: null,
	};
	const unpublished = await importSelected(input, {
		publishingPolicy: 'match-source',
	});
	expect(unpublished.agentOutcomes[0]).toMatchObject({
		agent: { activeVersionId: null },
		publishing: { state: 'unpublished' },
	});
});

describe('channels', () => {
	const slackSettings = { messagingExperience: 'agent', onlyRespondWhenMentioned: true } as const;

	/** Publish the Agent, then connect Slack on the destination as the channel UI would. */
	async function publishWithDestinationSlack(input: AgentPackageFixture) {
		const initial = await importSelected(input, { publishingPolicy: 'publish-all' });
		const published = initial.agentOutcomes[0].agent;
		expect(published.activeVersionId).not.toBeNull();
		const slack = await createCredentials(
			{ id: 'destination-slack', name: 'Slack', type: 'slackApi', data: '' },
			project,
		);
		await agents.update(published.id, {
			integrations: [{ type: 'slack', credentialId: slack.id }],
		});
		return published;
	}

	function withSourceSlack(input: AgentPackageFixture) {
		const agent = source(input);
		agent.config!.integrations = [
			{ type: 'slack', credentialId: 'source-slack', settings: slackSettings },
		];
		input.manifest.requirements = {
			credentials: [
				{
					id: 'source-slack',
					name: 'Source Slack',
					type: 'slackApi',
					usedBy: [{ kind: 'agent', id: agent.id }],
				},
			],
		};
		return agent;
	}

	it('reuses the destination connection when publication fails or stays unchanged', async () => {
		const input = publishableFixture();
		input.manifest.agents.splice(1);
		const published = await publishWithDestinationSlack(input);
		withSourceSlack(input);
		const disconnect = vi.spyOn(Container.get(ChatIntegrationService), 'disconnect');
		deniedPublishName = published.name;

		const failed = await importSelected(input, {
			credentialMissingMode: 'create-stub',
			publishingPolicy: 'publish-all',
		});
		input.files[`${input.manifest.agents[0].target}/agent-metadata.json`] = {
			versionId: 'selected-draft',
			publishedVersionId: 'absent-published-version',
		};
		const unchanged = await importSelected(input, { credentialMissingMode: 'create-stub' });

		expect(failed.agentOutcomes[0].publishing.state).toBe('failed');
		expect(unchanged.agentOutcomes[0].publishing).toEqual({ state: 'unchanged' });
		for (const imported of [failed, unchanged]) {
			expect(imported.agentOutcomes[0]).toMatchObject({
				status: 'updated',
				agent: { activeVersionId: published.activeVersionId },
				channels: [{ type: 'slack', status: 'reused' }],
			});
		}
		expect((await agents.findById(published.id))?.integrations).toEqual([
			{ type: 'slack', credentialId: 'destination-slack', settings: slackSettings },
		]);
		expect(disconnect).not.toHaveBeenCalled();
		expect(await Container.get(CredentialsRepository).findOneBy({ id: 'source-slack' })).toBeNull();
	});

	it('keeps the verified connection when a new channel blocks publication', async () => {
		const input = publishableFixture();
		input.manifest.agents.splice(1);
		const published = await publishWithDestinationSlack(input);
		const agent = withSourceSlack(input);
		agent.config!.integrations!.push({
			type: 'telegram',
			credentialId: 'source-telegram',
			settings: { accessMode: 'private', allowedUsers: ['alice'] },
		});
		const disconnect = vi.spyOn(Container.get(ChatIntegrationService), 'disconnect');

		const imported = await importSelected(input, { publishingPolicy: 'publish-all' });

		expect(imported.agentOutcomes[0]).toMatchObject({
			agent: { activeVersionId: published.activeVersionId },
			publishing: { state: 'unchanged', skippedPublishReason: 'channel-setup-required' },
			channels: [
				{ type: 'slack', status: 'reused' },
				{ type: 'telegram', status: 'setup-required', reason: 'new-channel' },
			],
		});
		expect((await agents.findById(published.id))?.integrations).toEqual([
			{ type: 'slack', credentialId: 'destination-slack', settings: slackSettings },
			{
				type: 'telegram',
				credentialId: '',
				settings: { accessMode: 'private', allowedUsers: ['alice'] },
			},
		]);
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('does not set up a channel because the destination has the same credential', async () => {
		const input = publishableFixture();
		input.manifest.agents.splice(1);
		withSourceSlack(input);
		// The same credential ID exists here, for example on another instance with this Agent ID.
		await createCredentials(
			{ id: 'source-slack', name: 'Source Slack', type: 'slackApi', data: '' },
			project,
		);
		const connect = vi.spyOn(Container.get(ChatIntegrationService), 'connect');

		const imported = await importSelected(input, { publishingPolicy: 'publish-all' });

		expect(imported.agentOutcomes[0]).toMatchObject({
			status: 'created',
			publishing: { state: 'blocked', blockedReason: 'channel-setup-required' },
			channels: [{ type: 'slack', status: 'setup-required', reason: 'new-channel' }],
		});
		expect(imported.agentOutcomes[0].agent.integrations).toEqual([
			{ type: 'slack', credentialId: '', settings: slackSettings },
		]);
		expect(connect).not.toHaveBeenCalled();
	});
});

it.each([
	['stub-credential', false],
	['stub-credential', true],
	['missing-node-type', false],
	['missing-node-type', true],
] as const)(
	'reports %s with published=%s without blocking other consumers',
	async (reason, published) => {
		const input = publishableFixture();
		addWorkflowTool(input);
		let activeVersionId: string | null = null;
		if (published) {
			const initial = await importSelected(input, {
				publishingPolicy: 'publish-all',
			});
			activeVersionId = initial.agentOutcomes[0].agent.activeVersionId;
			expect(activeVersionId).not.toBeNull();
		}
		const first = source(input);
		first.config!.credential = 'missing-model';
		input.manifest.requirements = {
			credentials: [
				{
					id: 'missing-model',
					name: 'Model',
					type: 'openAiApi',
					usedBy: [{ kind: 'agent', id: first.id }],
				},
			],
		};
		if (reason === 'missing-node-type')
			first.config!.tools!.push({
				type: 'node',
				name: 'Missing tool',
				node: { nodeType: 'missing.node', nodeTypeVersion: 1, nodeParameters: {} },
			});
		const options = {
			credentialMissingMode: 'create-stub',
			missingNodeTypeMode: 'import-anyway',
		} as const;
		const imported = await importSelected(input, {
			...options,
			publishingPolicy: 'publish-all',
		});
		expect(imported.agentOutcomes[0].publishing).toEqual(
			published
				? { state: 'unchanged', skippedPublishReason: reason }
				: { state: 'blocked', blockedReason: reason },
		);
		expect(imported.agentOutcomes[0].agent.activeVersionId).toBe(activeVersionId);
		expect(imported.agentOutcomes[0].agent.schema!.credential).toBe('missing-model');
		expect(imported.agentOutcomes[1].publishing).toEqual({ state: 'published' });
		expect(imported.result.workflows[0].publishing).toEqual({ state: 'published' });
		if (published) {
			source(input).config!.credential = 'unpublish-model';
			input.manifest.requirements.credentials![0].id = 'unpublish-model';
			const unpublished = await importSelected(input, {
				...options,
				publishingPolicy: 'unpublish-all',
			});
			expect(unpublished.scopes[0].imported.agentOutcomes[0]).toMatchObject({
				blockedFromPublish: reason,
			});
			expect(unpublished.agentOutcomes[0]).toMatchObject({
				agent: { activeVersionId: null },
				publishing: { state: 'unpublished' },
			});
		}
	},
);

it.each(['publish', 'unpublish'] as const)(
	'rechecks the %s scope after definition application',
	async (action) => {
		const input = publishableFixture();
		if (action === 'unpublish')
			await importSelected(input, {
				publishingPolicy: 'publish-all',
			});
		const member = await createMember();
		const allowed = await createCustomRoleWithScopeSlugs(
			[
				'agent:import',
				'agent:read',
				'agent:create',
				'agent:update',
				'agent:publish',
				'agent:unpublish',
				// The package skills belong to the project.
				'projectSkill:read',
				'projectSkill:create',
				'projectSkill:update',
			],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, allowed.slug);
		const policy = action === 'publish' ? 'publish-all' : 'unpublish-all';
		const content = await orchestrator.apply(
			await planFor(input, {
				user: member,
				publishingPolicy: policy,
			}),
		);
		const denied = await createCustomRoleWithScopeSlugs(['agent:read'], { roleType: 'project' });
		await linkUserToProject(member, project, denied.slug);
		const before = await agents.findByProjectId(project.id);
		const result = await orchestrator.publishPackage({
			user: member,
			content: [content],
			policy,
			subWorkflowRequirements: undefined,
		});
		expect(result.agentOutcomes.map(({ publishing }) => publishing)).toEqual([
			{ state: 'failed', error: expect.stringContaining('permission') },
			{ state: 'failed', error: expect.stringContaining('permission') },
		]);
		expect(await agents.findByProjectId(project.id)).toEqual(before);
	},
);

it.each(['publish', 'unpublish'] as const)(
	'reports a stale revision on %s and continues with other Agents',
	async (action) => {
		const input = publishableFixture();
		if (action === 'unpublish')
			await importSelected(input, {
				publishingPolicy: 'publish-all',
			});
		const policy = action === 'publish' ? 'publish-all' : 'unpublish-all';
		const content = await orchestrator.apply(await planFor(input, { publishingPolicy: policy }));
		const current = (await agents.findById(content.agentOutcomes[0].agent.id))!;
		current.name = 'Concurrent edit';
		await agents.saveDraftFenced(current);
		const before = await agents.findById(current.id);
		const result = await orchestrator.publishPackage({
			user: owner,
			content: [content],
			policy,
			subWorkflowRequirements: undefined,
		});
		expect(result.agentOutcomes[0]).toMatchObject({
			agent: {
				name: 'Concurrent edit',
				revision: current.revision,
				activeVersionId: current.activeVersionId,
			},
			publishing: { state: 'failed', error: expect.stringContaining('modified concurrently') },
		});
		expect(await agents.findById(current.id)).toEqual(before);
		expect(result.agentOutcomes[1].publishing.state).toBe(
			action === 'publish' ? 'published' : 'unpublished',
		);
	},
);

it.each(['validation', 'policy', 'post-commit'] as const)(
	'retains imported definitions after a %s publication failure',
	async (failure) => {
		const warning = vi.spyOn(Container.get(Logger), 'warn');
		const input = publishableFixture();
		if (failure === 'validation') source(input).config!.instructions = '';
		const content = await orchestrator.apply(
			await planFor(input, {
				publishingPolicy: 'publish-all',
			}),
		);
		const saved = content.agentOutcomes[0].agent;
		if (failure === 'policy') deniedPublishName = saved.name;
		if (failure === 'post-commit')
			broadcaster.notify.mockImplementationOnce(() => {
				throw new Error('Broadcast failed: api_key=sample-key');
			});
		const result = await orchestrator.publishPackage({
			user: owner,
			content: [content],
			policy: 'publish-all',
			subWorkflowRequirements: undefined,
		});
		expect(result.agentOutcomes[0].publishing.state).toBe('failed');
		expect(result.agentOutcomes[1].publishing).toEqual({ state: 'published' });
		const persisted = (await agents.findById(saved.id))!;
		expect(persisted.schema).toEqual(saved.schema);
		expect(persisted.activeVersionId).toBe(failure === 'post-commit' ? saved.versionId : null);
		expect(result.agentOutcomes[0].agent.activeVersionId).toBe(persisted.activeVersionId);
		if (failure === 'post-commit') {
			const expectedError = 'Broadcast failed: [REDACTED]';
			expect(result.agentOutcomes[0].publishing.error).toBe(expectedError);
			expect(warning).toHaveBeenCalledWith('Failed to apply publishing policy to imported Agent', {
				agentId: saved.id,
				action: 'publish',
				error: expectedError,
			});
		}
	},
);

it.each(['create', 'update'] as const)(
	'rolls back the current %s after a task write fails, and keeps earlier saves',
	async (action) => {
		const input = fixture();
		const options = { idPolicy: 'source' } as const;
		if (action === 'update') await importSelected(input, options);
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
		const skillRefs = Container.get(AgentSkillRefsService);
		const beforeSkills = await skillRefs.readDraft({ id: 'research_source' }, {});
		const skillRepository = Container.get(SkillRepository);
		const researchSkillIds = Object.keys(second.skills);
		const beforeSkillCount = (await skillRepository.findByIds(researchSkillIds)).length;
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
		expect(await skillRefs.readDraft({ id: 'research_source' }, {})).toEqual(beforeSkills);
		expect(await skillRepository.findByIds(researchSkillIds)).toHaveLength(beforeSkillCount);
		expect(await agents.findById('support_source')).toMatchObject({
			schema: { instructions: 'Keep this earlier save.' },
		});
		expect(effects.mock.calls.map(([event]) => event.agent.id)).toEqual(['support_source']);
		expect(plan.agentPlan).toEqual(original);
	},
);

it('rejects a plan made before a concurrent draft change', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const saved = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	const plan = await planFor(input);
	const current = (await agents.findById(saved.id))!;
	current.name = 'Concurrent name';
	await agents.saveDraftFenced(current);
	const before = await agents.findById(saved.id);
	const effects = vi.spyOn(Container.get(AgentSaveCompletionService), 'definitionSaved');
	await expect(orchestrator.apply(plan)).rejects.toBeInstanceOf(ConflictError);
	expect(await agents.findById(saved.id)).toEqual(before);
	expect(effects).not.toHaveBeenCalled();
});

it('keeps a concurrent publication when applying a draft import', async () => {
	const input = publishableFixture();
	input.manifest.agents.splice(1);
	const saved = (await importSelected(input)).scopes[0].imported.agentOutcomes[0].agent;
	source(input).config!.instructions = 'Updated draft instructions.';
	const plan = await planFor(input);
	const { agent: published } = await Container.get(AgentPublishService).publishAgent(
		saved.id,
		project.id,
		owner,
		{ by: 'user', trigger: 'explicit' },
	);
	const imported = await orchestrator.apply(plan);
	const current = (await agents.findById(saved.id))!;
	expect(imported.agentOutcomes[0]).toMatchObject({ status: 'updated', publishingAction: 'noop' });
	expect(current).toMatchObject({
		schema: { instructions: 'Updated draft instructions.' },
		revision: saved.revision + 1,
		activeVersionId: saved.versionId,
		publicationRevision: published.publicationRevision,
	});
	expect(current.versionId).not.toBe(saved.versionId);
	expect(
		await Container.get(AgentHistoryRepository).findByVersionAndAgentId(saved.versionId!, saved.id),
	).toMatchObject({ schema: saved.schema, tools: saved.tools });
});

it('keeps strict creation when a planned ID becomes occupied', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const plan = await planFor(input);
	const id = plan.agentPlan!.items[0].sourceAgentId;
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
			['agent:import', 'agent:read', 'agent:create', 'agent:update', 'workflow:import'],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, allowed.slug);
		const plan = await planFor(input, { user: member });
		const denied = await createCustomRoleWithScopeSlugs(
			['agent:import', 'agent:read', 'workflow:import'],
			{
				roleType: 'project',
			},
		);
		await linkUserToProject(member, project, denied.slug);
		const before = await agents.findByProjectId(project.id);
		await expect(orchestrator.apply(plan)).rejects.toBeInstanceOf(ForbiddenError);
		expect(await agents.findByProjectId(project.id)).toEqual(before);
	},
);

it('rejects a static child workflow outside the destination project at save time', async () => {
	const input = fixture();
	input.manifest.agents.splice(1);
	const otherProject = await createTeamProject('Other destination', owner);
	const workflow = await createWorkflow(
		{ name: 'Lookup', nodes: [], connections: {} },
		otherProject,
	);
	const plan = await planFor(input);
	expect(plan.blockingIssues).toEqual([]);
	plan.agentPlan!.items[0].config!.tools!.push({
		type: 'node',
		name: 'Execute',
		enabled: false,
		node: {
			nodeType: 'n8n-nodes-base.executeWorkflow',
			nodeTypeVersion: 1,
			nodeParameters: { workflowId: { __rl: true, value: workflow.id, mode: 'id' } },
		},
	});
	await expect(orchestrator.apply(plan)).rejects.toThrow(
		`Workflow "${workflow.id}" is missing or inaccessible.`,
	);
	expect(await agents.findByProjectId(project.id)).toEqual([]);
	expect(await tasks.count()).toBe(0);
});

it.each(['skill', 'body', 'task', 'credential', 'policy'] as const)(
	'runs the save-time %s check before any definition write',
	async (failure) => {
		const input = fixture();
		input.manifest.agents.splice(1);
		const plan = await planFor(input);
		const item = plan.agentPlan!.items[0];
		if (failure === 'skill')
			item.skills.duplicate = {
				...item.skills['support_source_skill'],
				name: item.skills['support_source_skill'].name.toUpperCase(),
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
				/hard to tell apart|without a body|cron|missing or inaccessible/i,
			);
		expect(await agents.findByProjectId(project.id)).toEqual([]);
		expect(await tasks.count()).toBe(0);
		expect(effects).not.toHaveBeenCalled();
	},
);
