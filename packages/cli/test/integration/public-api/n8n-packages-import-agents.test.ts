import {
	AI_GATEWAY_MANAGED_TAG,
	ImportResultDto,
	type ExportPackageRequestDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { InstanceSettings } from 'n8n-core';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { Readable } from 'node:stream';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import {
	looseAgentsFixture,
	projectAgentsFixture,
	writeAgentPackageFixture,
} from '@/modules/n8n-packages/__tests__/fixtures/agent-package-fixtures';
import { streamToBuffer } from '@/modules/n8n-packages/__tests__/utils/tar-support';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { serializedAgentSchema } from '@/modules/n8n-packages/spec/serialized/agent.schema';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';
import { createCredentials } from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);
mockInstance(Telemetry);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
beforeAll(async () => await testModules.loadModules(['n8n-packages', 'agents']));
const server = setupTestServer({
	endpointGroups: ['publicApi'],
	enabledFeatures: ['feat:projectRole:admin', 'feat:projectRole:editor', 'feat:projectRole:viewer'],
	quotas: { 'quota:maxTeamProjects': 100 },
});
let owner: User;
let destination: Project;
let sourceProject: Project;
let sourceAgents: Agent[];
let agents: AgentRepository;
let tasks: AgentTaskRepository;

beforeAll(async () => {
	agents = Container.get(AgentRepository);
	tasks = Container.get(AgentTaskRepository);
	Container.get(InstanceSettings).markAsLeader();
	await initNodeTypes({
		'n8n-nodes-base.executeWorkflowTrigger': { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	});
});

beforeEach(async () => {
	vi.spyOn(Container.get(AiGatewayService), 'getCredentialTypeForProviderCached').mockReturnValue(
		'openAiApi',
	);
	vi.spyOn(Container.get(AgentTaskService), 'requestReconcile').mockResolvedValue();
	owner = await createOwnerWithApiKey();
	destination = await createTeamProject('Destination', owner);
	sourceProject = await createTeamProject('Source', owner);
	sourceAgents = [];
	const fixture = looseAgentsFixture();
	for (const [index, entry] of fixture.manifest.agents.entries()) {
		const {
			config,
			tasks: taskDefinitions,
			...definition
		} = serializedAgentSchema.parse(fixture.files[`${entry.target}/agent.json`]);
		for (const [id, tool] of Object.entries(definition.tools)) tool.descriptor.name = id;
		const agent = await agents.save({
			...definition,
			projectId: sourceProject.id,
			versionId: 'source-draft',
			schema: {
				...config!,
				model: 'openai/gpt-4.1-mini',
				credential: AI_GATEWAY_MANAGED_TAG,
				instructions: 'Help with requests.',
				mcpServers: [],
				subAgents: { agents: [{ agentId: fixture.manifest.agents[1 - index].id }] },
			},
		});
		await tasks.save(
			Object.entries(taskDefinitions).map(([id, task]) => ({ id, agentId: agent.id, ...task })),
		);
		sourceAgents.push(agent);
	}
});

afterEach(async () => {
	vi.restoreAllMocks();
	await agents.delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'ProjectRelation',
		'Project',
	]);
});

async function download(
	selection: Partial<ExportPackageRequestDto> = { agentIds: [sourceAgents[0].id] },
) {
	const response = await server
		.publicApiAgentFor(owner)
		.post('/n8n-packages/export')
		.send({
			...selection,
			dependencyPolicy: 'include-in-package',
			versionPolicy: 'latest',
			credentialExportPolicy: 'no-values',
		})
		.buffer(true)
		.parse((stream, callback) => {
			void streamToBuffer(stream as unknown as Readable)
				.then((buffer) => callback(null, buffer))
				.catch((error: Error) => callback(error, null));
		});
	expect(response.statusCode).toBe(200);
	return response.body as Buffer;
}

async function upload(packageBuffer: Buffer, fields: Record<string, string> = {}, user = owner) {
	return await server
		.publicApiAgentFor(user)
		.post('/n8n-packages/import')
		.field({
			conflictPolicy: 'new-version',
			agentIdPolicy: 'new',
			projectId: destination.id,
			...fields,
		})
		.attach('package', packageBuffer, 'agents.n8np');
}

async function addWorkflowDependency() {
	const workflow = await createWorkflow(
		{
			id: sourceAgents[0].id,
			name: 'Lookup',
			nodes: ['executeWorkflowTrigger', 'scheduleTrigger'].map((type) => ({
				id: type,
				name: type,
				type: `n8n-nodes-base.${type}`,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			})),
		},
		sourceProject,
	);
	sourceAgents[0].schema!.tools!.push({
		type: 'workflow',
		workflowId: workflow.id,
		workflow: workflow.name,
	});
	await agents.save(sourceAgents[0]);
	return workflow;
}

async function records() {
	return {
		agents: await agents.find({ order: { id: 'ASC' } }),
		tasks: await tasks.find({ order: { id: 'ASC' } }),
		workflows: await Container.get(WorkflowRepository).find({ order: { id: 'ASC' } }),
		projects: await Container.get(ProjectRepository).find({ order: { id: 'ASC' } }),
	};
}

it.each(['loose', 'project'] as const)(
	'round trips complete Agents through a %s package',
	async (shape) => {
		const workflow = await addWorkflowDependency();
		let bindings = '{}';
		let credentialId = AI_GATEWAY_MANAGED_TAG;
		if (shape === 'loose') {
			const sourceCredential = await createCredentials(
				{ name: 'Source model', type: 'openAiApi', data: '' },
				sourceProject,
			);
			const targetCredential = await createCredentials(
				{ name: 'Target model', type: 'openAiApi', data: '' },
				destination,
			);
			credentialId = targetCredential.id;
			sourceAgents[0].schema!.credential = sourceCredential.id;
			await agents.save(sourceAgents[0]);
			bindings = JSON.stringify({ credentials: { [sourceCredential.id]: targetCredential.id } });
		}
		const archive = await download(
			shape === 'project' ? { projectIds: [sourceProject.id] } : undefined,
		);
		if (shape === 'project') {
			await agents.delete({ projectId: sourceProject.id });
			await Container.get(WorkflowRepository).delete(workflow.id);
			await Container.get(ProjectRepository).delete(sourceProject.id);
		}
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const response = await upload(archive, { bindings, workflowIdPolicy: 'new' });
		expect(response.statusCode).toBe(200);
		const result = ImportResultDto.parse(response.body);
		expect(result.agents).toHaveLength(2);
		expect(result.counts.agents).toEqual({ created: 2, updated: 0, skipped: 0 });
		const projectId = shape === 'project' ? sourceProject.id : destination.id;
		if (shape === 'project')
			expect(result.projects).toMatchObject([{ localId: projectId, status: 'created' }]);
		for (const [index, source] of sourceAgents.entries()) {
			const localId = result.bindings.agents[source.id];
			expect(response.body.agents).toContainEqual({
				sourceAgentId: source.id,
				localId,
				name: source.name,
				projectId,
				activeVersionId: null,
				status: 'created',
				publishing: { state: 'unchanged' },
			});
			const saved = await agents.findById(localId);
			expect(saved).toMatchObject({
				sourceAgentId: source.id,
				skills: source.skills,
				tools: source.tools,
				availableInMCP: source.availableInMCP,
				schema: {
					credential: index === 0 ? credentialId : AI_GATEWAY_MANAGED_TAG,
					subAgents: { agents: [{ agentId: result.bindings.agents[sourceAgents[1 - index].id] }] },
				},
			});
			const [task] = await tasks.findByAgentId(localId);
			expect(task).toMatchObject({
				sourceTaskId: `${source.id}_task`,
				objective: 'Summarize the open requests.',
			});
			expect(saved!.schema!.tasks![0].id).toBe(task.id);
		}
		expect(
			(await agents.findById(result.bindings.agents[sourceAgents[0].id]))!.schema!.tools,
		).toContainEqual(
			expect.objectContaining({ workflowId: result.bindings.workflows[workflow.id] }),
		);
		expect(result.bindings.agents[workflow.id]).not.toBe(result.bindings.workflows[workflow.id]);
		expect(emit).toHaveBeenCalledWith(
			'n8n-package-imported',
			expect.objectContaining({
				agentIds: result.agents.map(({ localId }) => localId),
				counts: expect.objectContaining(result.counts),
				options: expect.objectContaining({
					conflictPolicy: 'new-version',
					workflowConflictPolicy: 'new-version',
					agentIdPolicy: 'new',
				}),
			}),
		);
	},
);

it('shares conflict policy across mixed content and keeps ID and publication policies independent', async () => {
	const workflow = await addWorkflowDependency();
	const archive = await download();
	await Container.get(WorkflowRepository).delete(workflow.id);
	const created = await upload(archive, {
		workflowIdPolicy: 'source',
		workflowPublishingPolicy: 'publish-all',
		agentPublishingPolicy: 'unpublish-all',
	});
	expect(created.statusCode).toBe(200);
	const initial = ImportResultDto.parse(created.body);
	expect(initial.bindings.workflows[workflow.id]).toBe(workflow.id);
	expect(initial.bindings.agents[workflow.id]).not.toBe(workflow.id);
	expect(initial.workflows[0].publishing.state).toBe('published');
	expect(initial.agents.map(({ publishing }) => publishing.state)).toEqual([
		'unchanged',
		'unchanged',
	]);
	const updated = await upload(archive, {
		workflowIdPolicy: 'new',
		agentIdPolicy: 'source',
		agentPublishingPolicy: 'publish-all',
	});
	expect(updated.statusCode).toBe(200);
	expect(updated.body.bindings).toEqual(initial.bindings);
	expect(updated.body.counts.agents).toEqual({ created: 0, updated: 2, skipped: 0 });
	expect(updated.body.workflows[0].status).toBe('updated');
	expect(updated.body.agents).toMatchObject([
		{ status: 'updated', publishing: { state: 'published' } },
		{ status: 'updated', publishing: { state: 'published' } },
	]);
	const before = await records();
	const skipped = await upload(archive, {
		conflictPolicy: 'skip',
		agentPublishingPolicy: 'unpublish-all',
	});
	expect(skipped.statusCode).toBe(200);
	expect(skipped.body.bindings).toEqual(initial.bindings);
	expect(skipped.body.counts.agents).toEqual({ created: 0, updated: 0, skipped: 2 });
	expect(skipped.body.workflows[0].status).toBe('skipped');
	const conflict = await upload(archive, { conflictPolicy: 'fail' });
	expect(conflict.statusCode).toBe(409);
	expect(conflict.body.issues).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ type: 'agent-conflict' }),
			expect.objectContaining({ type: 'workflow-conflict' }),
		]),
	);
	expect(await records()).toEqual(before);
});

it('imports with Agent-only grants and skips with no write grants', async () => {
	const archive = await download();
	const member = await createMemberWithApiKey({
		scopes: ['agent:import', 'agent:read', 'agent:create'],
	});
	await linkUserToProject(member, destination, 'project:editor');
	const created = await upload(archive, {}, member);
	expect(created.statusCode).toBe(200);
	const reader = await createMemberWithApiKey({ scopes: ['agent:import', 'agent:read'] });
	const role = await createCustomRoleWithScopeSlugs(['agent:import', 'agent:read'], {
		roleType: 'project',
	});
	await linkUserToProject(reader, destination, role.slug);
	const before = await records();
	const skipped = await upload(
		archive,
		{ conflictPolicy: 'skip', agentPublishingPolicy: 'publish-all' },
		reader,
	);
	expect(skipped.statusCode).toBe(200);
	expect(skipped.body.counts.agents).toEqual({ created: 0, updated: 0, skipped: 2 });
	expect(await records()).toEqual(before);
});

it.each(['read', 'create', 'update', 'publish', 'unpublish'] as const)(
	'requires the planned agent:%s API-key grant',
	async (action) => {
		const archive = await download();
		if (action === 'update' || action === 'unpublish') {
			expect((await upload(archive, { agentPublishingPolicy: 'publish-all' })).statusCode).toBe(
				200,
			);
		}
		const scopes: ApiKeyScope[] = [
			'agent:import',
			'agent:read',
			'agent:create',
			'agent:update',
			'agent:publish',
			'agent:unpublish',
		];
		const caller = await createOwnerWithApiKey({
			scopes: scopes.filter((scope) => scope !== `agent:${action}`),
		});
		const agentPublishingPolicy = action === 'unpublish' ? 'unpublish-all' : 'publish-all';
		const before = await records();
		const response = await upload(archive, { agentPublishingPolicy }, caller);
		expect(response.statusCode).toBe(403);
		expect(await records()).toEqual(before);
	},
);

it.each(['project:viewer', 'project:chatUser'] as const)(
	'rejects an import for %s despite API-key grants',
	async (role) => {
		const archive = await download();
		const member = await createMemberWithApiKey({
			scopes: ['agent:import', 'agent:read', 'agent:create'],
		});
		await linkUserToProject(member, destination, role);
		const before = await records();
		expect((await upload(archive, {}, member)).statusCode).toBe(403);
		expect(await records()).toEqual(before);
	},
);

it.each(['agent:import', 'workflow:import'] as const)(
	'requires %s for a mixed package',
	async (missing) => {
		await addWorkflowDependency();
		const archive = await download();
		const scopes: ApiKeyScope[] = ['agent:import', 'workflow:import', 'agent:read', 'agent:create'];
		const caller = await createOwnerWithApiKey({
			scopes: scopes.filter((scope) => scope !== missing),
		});
		const before = await records();
		expect((await upload(archive, {}, caller)).statusCode).toBe(403);
		expect(await records()).toEqual(before);
	},
);

it('reports a blocked plan without creating the destination project', async () => {
	const fixture = projectAgentsFixture();
	delete fixture.manifest.requirements;
	const entry = fixture.manifest.agents[0];
	const agent = serializedAgentSchema.parse(fixture.files[`${entry.target}/agent.json`]);
	agent.config!.subAgents = { agents: [{ agentId: agent.id }] };
	fixture.files[`${entry.target}/agent.json`] = agent;
	const writer = new TarPackageWriter();
	await writeAgentPackageFixture(writer, fixture);
	const before = await records();
	const emit = vi.spyOn(Container.get(EventService), 'emit');
	const response = await upload(await streamToBuffer(writer.finalize()));
	expect(response.statusCode).toBe(422);
	expect(response.body.issues).toContainEqual(expect.objectContaining({ type: 'agent-invalid' }));
	expect(await records()).toEqual(before);
	expect(emit).toHaveBeenCalledWith(
		'n8n-package-import-failed',
		expect.objectContaining({ reason: 'blocked' }),
	);
});

it('returns saved definitions and continues when one publication fails', async () => {
	sourceAgents[0].schema!.model = '';
	sourceAgents[0].schema!.credential = '';
	await agents.save(sourceAgents[0]);
	const response = await upload(await download(), { agentPublishingPolicy: 'publish-all' });
	expect(response.statusCode).toBe(200);
	const result = ImportResultDto.parse(response.body);
	expect(result.agents[0]).toMatchObject({
		status: 'created',
		activeVersionId: null,
		publishing: { state: 'failed', error: expect.any(String) },
	});
	expect(result.agents[1]).toMatchObject({
		status: 'created',
		activeVersionId: expect.any(String),
		publishing: { state: 'published' },
	});
	expect(await agents.findByProjectId(destination.id)).toHaveLength(2);
	expect(result.counts.agents).toEqual({ created: 2, updated: 0, skipped: 0 });
});

it('rejects Agent content on import-selection while the Agents module is active', async () => {
	const archive = await download({ projectIds: [sourceProject.id] });
	const before = await records();
	const response = await server
		.publicApiAgentFor(owner)
		.post('/n8n-packages/import-selection')
		.field({ selectedProjectId: sourceProject.id, selectedWorkflowIds: '[]' })
		.attach('package', archive, 'agents.n8np');
	expect(response.statusCode).toBe(400);
	expect(response.body.message).toContain('ordinary archive import');
	expect(await records()).toEqual(before);
});
