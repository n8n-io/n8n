import { AgentJsonConfigSchema, type ExportPackageRequestDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { looseAgentsFixture } from '@/modules/n8n-packages/__tests__/fixtures/agent-package-fixtures';
import { streamToBuffer } from '@/modules/n8n-packages/__tests__/utils/tar-support';
import {
	buildVersionedWorkflow,
	noOpNode,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { N8nPackageParser } from '@/modules/n8n-packages/engine/n8n-package-parser';
import { AgentExporter } from '@/modules/n8n-packages/entities/agent/agent.exporter';
import { TarPackageReader } from '@/modules/n8n-packages/io/tar/tar-package-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import type { ExportPackageEventCounts } from '@/modules/n8n-packages/n8n-packages.types';
import { serializedAgentSchema } from '@/modules/n8n-packages/spec/serialized/agent.schema';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { createProjectVariable } from '@test-integration/db/variables';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => await testModules.loadModules(['n8n-packages', 'agents']));
const server = setupTestServer({ endpointGroups: ['publicApi'] });
let owner: User;
let project: Project;
let otherProject: Project;
let agent: Agent;
let dependency: Agent;
let workflow: WorkflowEntity;
let repository: AgentRepository;

beforeAll(() => {
	repository = Container.get(AgentRepository);
	Container.get(InstanceSettings).markAsLeader();
});

beforeEach(async () => {
	owner = await createOwnerWithApiKey();
	project = await createTeamProject('Selected project', owner);
	otherProject = await createTeamProject('Dependency project', owner);
	agent = await repository.save({
		id: 'support_source',
		name: 'Support',
		projectId: project.id,
		schema: AgentJsonConfigSchema.parse({ name: 'Support', model: '', instructions: '' }),
		versionId: 'draft-version',
	});
	dependency = await repository.save({
		id: 'dependency',
		name: 'Dependency',
		projectId: otherProject.id,
		schema: null,
	});
	workflow = await createWorkflow({ name: 'Workflow dependency', nodes: [] }, otherProject);
});

afterEach(async () => {
	vi.restoreAllMocks();
	await repository.delete({});
	await Container.get(AgentHistoryRepository).delete({});
	await Container.get(AgentTaskRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'Folder',
		'ProjectRelation',
		'Project',
		'Variables',
	]);
});

async function addReferences() {
	await repository.save({
		id: agent.id,
		schema: AgentJsonConfigSchema.parse({
			...agent.schema,
			subAgents: { agents: [{ agentId: dependency.id, enabled: false }] },
			tools: [
				...(agent.schema?.tools ?? []),
				{ type: 'workflow', workflowId: workflow.id, workflow: 'Display only', enabled: false },
			],
		}),
	});
}

async function download(body: Partial<ExportPackageRequestDto>, user = owner) {
	const response = await server
		.publicApiAgentFor(user)
		.post('/n8n-packages/export')
		.send(body)
		.buffer(true)
		.parse((stream, callback) => {
			void streamToBuffer(stream as unknown as Readable)
				.then((buffer) => callback(null, buffer))
				.catch((error: Error) => callback(error, null));
		});
	expect(response.statusCode).toBe(200);
	const reader = new TarPackageReader(response.body, new PackageImportConfig());
	const manifest = await Container.get(N8nPackageParser).getManifest(reader);
	return {
		reader,
		manifest,
		counts: jsonParse<ExportPackageEventCounts>(response.headers['x-n8n-export-counts']),
	};
}

it('downloads an Agent with its skills, tools, tasks, and dependencies', async () => {
	const { config, tasks, ...content } = serializedAgentSchema.parse(
		looseAgentsFixture().files['agents/support/agent.json'],
	);
	agent = await repository.save({ ...agent, ...content, schema: config });
	await Container.get(AgentTaskRepository).save(
		Object.entries(tasks).map(([id, task]) => ({ id, agentId: agent.id, ...task })),
	);
	await addReferences();
	const caller = await createOwnerWithApiKey({ scopes: ['agent:export'] });
	const emit = vi.spyOn(Container.get(EventService), 'emit');
	const { reader, manifest, counts } = await download(
		{
			agentIds: [agent.id],
			dependencyPolicy: 'include-in-package',
		},
		caller,
	);
	expect(manifest.agents?.map(({ id }) => id)).toEqual([agent.id, dependency.id]);
	expect(manifest.workflows?.map(({ id }) => id)).toEqual([workflow.id]);
	expect(counts).toMatchObject({ agents: 2, workflows: 1 });
	expect(emit).toHaveBeenCalledWith(
		'n8n-package-exported',
		expect.objectContaining({ agentIds: [agent.id, dependency.id], counts }),
	);
	const [parsed] = await Container.get(N8nPackageParser).getAgents(reader);
	expect(parsed).toMatchObject({
		sourceAgentId: agent.id,
		availableInMCP: true,
		config: { skills: [{ enabled: false }], tasks: [{ enabled: false }] },
		skills: content.skills,
		tools: content.tools,
		tasks: { [`${agent.id}_task`]: { cronExpression: '0 9 * * *', timezone: null } },
	});
});

it.each(['mixed', 'project'] as const)('downloads a %s selection', async (selection) => {
	await addReferences();
	const body: Partial<ExportPackageRequestDto> = { projectIds: [project.id] };
	let scopes: ApiKeyScope[] = ['project:export'];
	if (selection === 'mixed') {
		delete body.projectIds;
		body.agentIds = [agent.id];
		body.workflowIds = [workflow.id];
		body.folderIds = [(await createFolder(project, { name: 'Selected folder' })).id];
		scopes = ['agent:export', 'workflow:export'];
	}
	const caller = await createOwnerWithApiKey({ scopes });
	const { manifest, counts } = await download(
		{
			...body,
			dependencyPolicy: 'include-in-package',
		},
		caller,
	);
	expect(manifest.agents?.map(({ id }) => id)).toEqual([agent.id, dependency.id]);
	expect(manifest.workflows?.map(({ id }) => id)).toEqual([workflow.id]);
	expect(counts).toMatchObject({ agents: 2, workflows: 1 });
});

it('records external Agent and workflow requirements with reference-only', async () => {
	await addReferences();
	const { manifest, counts } = await download({
		agentIds: [agent.id],
		dependencyPolicy: 'reference-only',
	});
	expect(counts).toMatchObject({ agents: 1, workflows: 0 });
	expect(manifest.requirements?.agents?.[0].id).toBe(dependency.id);
	expect(manifest.requirements?.workflows?.[0].id).toBe(workflow.id);
});

it.each(['agent', 'workflow'] as const)(
	'defaults to fail for a missing %s dependency',
	async (kind) => {
		await addReferences();
		const selection =
			kind === 'agent'
				? { agentIds: [agent.id], workflowIds: [workflow.id] }
				: { agentIds: [agent.id, dependency.id] };
		const response = await server
			.publicApiAgentFor(owner)
			.post('/n8n-packages/export')
			.send(selection);
		expect(response.statusCode).toBe(400);
		expect(response.headers['x-n8n-export-counts']).toBeUndefined();
	},
);

it.each(['published-strict', 'ignore-unpublished'] as const)(
	'applies version policy %s to Agents and workflows',
	async (versionPolicy) => {
		const { workflow: versionedWorkflow } = await buildVersionedWorkflow({
			name: 'Versioned workflow',
			project,
			versions: [[noOpNode('Published node')], [noOpNode('Draft node')]],
			publishedVersion: 0,
		});
		const schema = AgentJsonConfigSchema.parse({
			name: 'Published definition',
			model: '',
			instructions: '',
			tools: [{ type: 'workflow', workflowId: versionedWorkflow.id, workflow: 'Published tool' }],
		});
		await Container.get(AgentHistoryRepository).saveVersion({
			agentId: agent.id,
			versionId: 'published-version',
			publishedBy: 'Package test',
			schema,
			skills: {},
			tools: {},
		});
		await repository.update(agent.id, { activeVersionId: 'published-version' });
		const selection =
			versionPolicy === 'ignore-unpublished'
				? { agentIds: [agent.id, dependency.id], workflowIds: [workflow.id] }
				: { agentIds: [agent.id] };
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const { reader, counts } = await download({
			...selection,
			versionPolicy,
			dependencyPolicy: 'include-in-package',
		});
		const parser = Container.get(N8nPackageParser);
		const [parsed] = await parser.getAgents(reader);
		expect(parsed.config?.tools).toEqual(schema.tools);
		expect(parsed.metadata).toEqual({
			versionId: 'published-version',
			publishedVersionId: 'published-version',
		});
		const [parsedWorkflow] = await parser.getWorkflows(reader);
		expect(parsedWorkflow.entity.nodes).toEqual([noOpNode('Published node')]);
		expect(counts).toMatchObject({ agents: 1, workflows: 1 });
		expect(emit).toHaveBeenCalledWith(
			'n8n-package-exported',
			expect.objectContaining({ agentIds: [agent.id], workflowIds: [versionedWorkflow.id] }),
		);
	},
);

it('requires the Agent API-key scope for explicit selections before preparation', async () => {
	const limited = await createOwnerWithApiKey({ scopes: ['project:export', 'workflow:export'] });
	const prepare = vi.spyOn(Container.get(AgentExporter), 'prepare');
	const emit = vi.spyOn(Container.get(EventService), 'emit');
	const response = await server
		.publicApiAgentFor(limited)
		.post('/n8n-packages/export')
		.send({ agentIds: [agent.id] });
	expect(response.statusCode).toBe(403);
	expect(prepare).not.toHaveBeenCalled();
	expect(emit).toHaveBeenCalledWith(
		'n8n-package-export-failed',
		expect.objectContaining({ reason: 'access-denied' }),
	);
});

it('requires the user project role to allow Agent exports in a project selection', async () => {
	const caller = await createMemberWithApiKey({ scopes: ['project:export'] });
	const role = await createCustomRoleWithScopeSlugs(['project:export', 'agent:read']);
	await linkUserToProject(caller, project, role.slug);
	const prepare = vi.spyOn(Container.get(AgentExporter), 'prepare');
	const emit = vi.spyOn(Container.get(EventService), 'emit');
	const response = await server
		.publicApiAgentFor(caller)
		.post('/n8n-packages/export')
		.send({ projectIds: [project.id] });
	expect(response.statusCode).toBe(400);
	expect(prepare).not.toHaveBeenCalled();
	expect(emit).toHaveBeenCalledWith(
		'n8n-package-export-failed',
		expect.objectContaining({ reason: 'access-denied' }),
	);
});

it('allows a project without Agents with only the project API-key scope', async () => {
	const emptyProject = await createTeamProject('Empty project', owner);
	const caller = await createOwnerWithApiKey({ scopes: ['project:export'] });
	const { manifest, counts } = await download({ projectIds: [emptyProject.id] }, caller);
	expect(manifest.projects?.map(({ id }) => id)).toEqual([emptyProject.id]);
	expect(manifest.agents).toBeUndefined();
	expect(counts.agents).toBe(0);
});

it('requires variable:list only when Agent variable values are included', async () => {
	await createProjectVariable('REGION', 'source-project', project);
	await repository.save({
		id: agent.id,
		schema: AgentJsonConfigSchema.parse({
			...agent.schema,
			tools: [
				{
					type: 'node',
					name: 'Fetch',
					enabled: false,
					node: {
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeTypeVersion: 4,
						nodeParameters: { url: '={{ $vars.REGION }}' },
					},
				},
			],
		}),
	});
	const caller = await createOwnerWithApiKey({ scopes: ['agent:export'] });
	const response = await server
		.publicApiAgentFor(caller)
		.post('/n8n-packages/export')
		.send({ agentIds: [agent.id] });
	expect(response.statusCode).toBe(403);
	const { reader, manifest } = await download(
		{ agentIds: [agent.id], includeVariableValues: false },
		caller,
	);
	expect(manifest.requirements?.variables).toEqual([
		{ name: 'REGION', usedBy: [{ kind: 'agent', id: agent.id }] },
	]);
	const variables = await Container.get(N8nPackageParser).getVariables(reader);
	expect([...variables.values()]).toEqual([{ name: 'REGION', type: 'string' }]);
});

it.each(['selected', 'Agent dependency', 'workflow dependency'] as const)(
	'checks user access for a %s',
	async (selection) => {
		await addReferences();
		const caller = await createMemberWithApiKey({ scopes: ['agent:export'] });
		await linkUserToProject(caller, project, 'project:viewer');
		if (selection === 'workflow dependency') {
			const role = await createCustomRoleWithScopeSlugs(['agent:export']);
			await linkUserToProject(caller, otherProject, role.slug);
		}
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const response = await server
			.publicApiAgentFor(caller)
			.post('/n8n-packages/export')
			.send({
				agentIds: [selection === 'selected' ? dependency.id : agent.id],
				dependencyPolicy: 'include-in-package',
			});
		expect(response.statusCode).toBe(400);
		expect(emit).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'access-denied' }),
		);
		if (selection === 'selected') {
			const missing = await server
				.publicApiAgentFor(owner)
				.post('/n8n-packages/export')
				.send({ agentIds: ['missing-agent'] });
			expect(missing.statusCode).toBe(response.statusCode);
			expect(missing.body).toEqual(response.body);
			expect(emit).toHaveBeenCalledWith(
				'n8n-package-export-failed',
				expect.objectContaining({ reason: 'entity-not-found', agentIds: ['missing-agent'] }),
			);
		}
	},
);
