import { AgentJsonConfigSchema, type AgentJsonConfig } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { ProjectService } from '@/services/project.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';

import { AgentSelectionExporter } from '../entities/agent/agent-selection.exporter';
import { AgentExporter } from '../entities/agent/agent.exporter';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '../entities/package-export.errors';
import { CapturingWriter } from '../io/__tests__/utils/capturing-writer';
import { N8nPackagesService } from '../n8n-packages.service';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';
import { executeWorkflowNode } from './utils/test-builders';

let owner: User;
let project: Project;
let otherProject: Project;
let parent: Agent;
let child: Agent;
let repository: AgentRepository;
let exporter: AgentSelectionExporter;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'agents']);
	await testDb.init();
	repository = Container.get(AgentRepository);
	exporter = Container.get(AgentSelectionExporter);
});

afterAll(async () => await testDb.terminate());

beforeEach(async () => {
	await repository.delete({});
	await Container.get(AgentHistoryRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'Folder',
		'ProjectRelation',
		'Project',
	]);
	owner = await createOwner();
	project = await createTeamProject('Selected project', owner);
	otherProject = await createTeamProject('Dependency project', owner);
	[parent, child] = await repository.save([
		{
			id: 'parent',
			name: 'Parent',
			projectId: project.id,
			schema: null,
			versionId: 'parent_draft',
		},
		{
			id: 'child',
			name: 'Child',
			projectId: otherProject.id,
			schema: null,
			versionId: 'child_draft',
		},
	]);
});

afterEach(() => vi.restoreAllMocks());

async function setConfig(agent: Agent, config: Partial<AgentJsonConfig>) {
	const schema = AgentJsonConfigSchema.parse({
		name: agent.name,
		model: '',
		instructions: '',
		...agent.schema,
		...config,
	});
	await repository.save({ id: agent.id, schema });
	agent.schema = schema;
}

async function publish(agent: Agent) {
	const definition = await Container.get(AgentDefinitionService).readDraft(agent);
	const history = await Container.get(AgentHistoryRepository).saveVersion({
		agentId: agent.id,
		versionId: `${agent.id}_published`,
		publishedBy: 'Package test',
		schema: definition.schema,
		skills: definition.skills,
		tools: definition.tools,
	});
	await repository.setActiveVersionFenced(agent.id, agent.revision, {
		activeVersionId: history.versionId,
		versionId: agent.versionId!,
	});
}

it.each(['loose', 'project'] as const)(
	'exports a %s selection with Agent and workflow cycles',
	async (placement) => {
		const user = await createMember();
		await linkUserToProject(user, project, 'project:viewer');
		const dependencyRole = await createCustomRoleWithScopeSlugs([
			'agent:export',
			'workflow:export',
			'project:export',
		]);
		await linkUserToProject(user, otherProject, dependencyRole.slug);
		await createFolder(otherProject, { name: 'Unrelated folder' });
		await setConfig(parent, {
			model: 'openai/gpt-4o',
			credential: 'missing-model',
			subAgents: { agents: [{ agentId: child.id, enabled: false }, { agentId: child.id }] },
			tools: [
				{ type: 'workflow', workflowId: parent.id, workflow: 'Display name', enabled: false },
			],
		});
		await setConfig(child, { subAgents: { agents: [{ agentId: parent.id }] } });
		await repository.save({
			id: 'unrelated-agent',
			name: 'Unrelated',
			projectId: otherProject.id,
			schema: null,
		});
		const folder = await createFolder(project, { name: 'Selected folder' });
		const nested = await createWorkflow(
			{ id: 'nested', nodes: [executeWorkflowNode(parent.id)], parentFolder: folder },
			project,
		);
		const loose = await createWorkflow({ id: 'loose', nodes: [] }, project);
		await createWorkflow(
			{
				id: parent.id,
				name: 'Agent workflow',
				nodes: [executeWorkflowNode(nested.id)],
				settings: { errorWorkflow: nested.id },
			},
			otherProject,
		);
		await createWorkflow({ id: 'unrelated-workflow', nodes: [] }, otherProject);
		const findProjects = vi.spyOn(Container.get(ProjectService), 'findProjectsByIdsForUser');
		const { manifest, counts } = await Container.get(N8nPackagesService).exportPackageToWriter(
			{
				user,
				...(placement === 'project'
					? { projectIds: [project.id] }
					: { agentIds: [parent.id, parent.id], workflowIds: [loose.id], folderIds: [folder.id] }),
				includeTags: false,
				dependencyPolicy: 'include-in-package',
			},
			new CapturingWriter(),
		);
		expect(manifest.agents?.map(({ id }) => id)).toEqual([parent.id, child.id]);
		expect(counts).toMatchObject({ agents: 2, workflows: 3 });
		expect(manifest.workflows?.map(({ id }) => id).sort()).toEqual(
			['loose', 'nested', parent.id].sort(),
		);
		expect(manifest.requirements?.credentials).toEqual([
			{ id: 'missing-model', usedBy: [{ kind: 'agent', id: parent.id }] },
		]);
		expect(manifest.requirements?.workflows).toContainEqual({
			id: parent.id,
			name: 'Agent workflow',
			usedBy: [
				{ kind: 'agent', id: parent.id },
				{ kind: 'workflow', id: nested.id },
			],
		});
		expect((manifest.projects ?? []).map(({ id }) => id)).toEqual(
			placement === 'project' ? [project.id, otherProject.id] : [],
		);
		expect(
			findProjects.mock.calls.flatMap(([, ids]) => ids).filter((id) => id === project.id),
		).toEqual(placement === 'project' ? [project.id] : []);
		for (const entry of manifest.agents ?? []) {
			const projectId = entry.id === parent.id ? project.id : otherProject.id;
			const prefix =
				placement === 'project'
					? `${manifest.projects?.find(({ id }) => id === projectId)?.target}/`
					: '';
			expect(entry.target.startsWith(`${prefix}agents/`)).toBe(true);
		}
	},
);

it.each(['fail', 'reference-only', 'include-in-package'] as const)(
	'applies the %s Agent dependency policy',
	async (policy) => {
		await setConfig(parent, { subAgents: { agents: [{ agentId: child.id, enabled: false }] } });
		const writer = new CapturingWriter();
		const run = exporter.export({
			user: owner,
			writer,
			agentIds: [parent.id],
			dependencyPolicy: policy,
		});
		if (policy === 'fail') {
			await expect(run).rejects.toThrow(PackageExportBlockedError);
			expect(writer.files).toEqual([]);
			return;
		}
		const result = await run;
		expect(result.agentIds).toEqual(
			policy === 'include-in-package' ? [parent.id, child.id] : [parent.id],
		);
		expect(result.agentRequirements).toEqual([
			{
				id: child.id,
				...(policy === 'include-in-package' ? { name: child.name } : {}),
				usedBy: [{ kind: 'agent', id: parent.id }],
			},
		]);
	},
);

it('defaults to fail and accepts dependencies that were explicitly selected', async () => {
	await setConfig(parent, { subAgents: { agents: [{ agentId: child.id }] } });
	await expect(
		exporter.export({ user: owner, writer: new CapturingWriter(), agentIds: [parent.id] }),
	).rejects.toThrow(PackageExportBlockedError);
	const result = await exporter.export({
		user: owner,
		writer: new CapturingWriter(),
		agentIds: [parent.id, child.id],
	});
	expect(result.agentIds).toEqual([parent.id, child.id]);
});

it.each(['selected', 'dependency'] as const)('rejects a missing %s Agent', async (selection) => {
	await setConfig(parent, { subAgents: { agents: [{ agentId: 'missing-agent' }] } });
	await expect(
		exporter.export({
			user: owner,
			writer: new CapturingWriter(),
			agentIds: [selection === 'selected' ? 'missing-agent' : parent.id],
			dependencyPolicy: 'include-in-package',
		}),
	).rejects.toThrow(PackageEntityNotFoundError);
});

it.each(['read-only', 'chat-only', 'custom-export', 'viewer', 'nonmember'] as const)(
	'checks export access for a %s user',
	async (role) => {
		const user = await createMember();
		if (role === 'viewer') await linkUserToProject(user, project, 'project:viewer');
		if (role === 'chat-only') await linkUserToProject(user, project, 'project:chatUser');
		if (role === 'read-only' || role === 'custom-export') {
			const custom = await createCustomRoleWithScopeSlugs(
				role === 'custom-export'
					? ['agent:export', 'project:export']
					: ['agent:read', 'project:export'],
			);
			await linkUserToProject(user, project, custom.slug);
		}
		const run = exporter.export({ user, writer: new CapturingWriter(), agentIds: [parent.id] });
		if (role === 'custom-export' || role === 'viewer') {
			expect((await run).agentIds).toEqual([parent.id]);
		} else {
			await expect(run).rejects.toThrow(PackageEntityAccessDeniedError);
		}
	},
);

it.each(['reference-only', 'include-in-package'] as const)(
	'handles an inaccessible Agent dependency with %s',
	async (policy) => {
		const user = await createMember();
		await linkUserToProject(user, project, 'project:viewer');
		await setConfig(parent, { subAgents: { agents: [{ agentId: child.id }] } });
		const run = exporter.export({
			user,
			writer: new CapturingWriter(),
			agentIds: [parent.id],
			dependencyPolicy: policy,
		});
		if (policy === 'include-in-package') {
			await expect(run).rejects.toThrow(PackageEntityAccessDeniedError);
			return;
		}
		expect((await run).agentRequirements).toEqual([
			{ id: child.id, usedBy: [{ kind: 'agent', id: parent.id }] },
		]);
	},
);

it.each(['latest', 'published-strict'] as const)(
	'extracts references from the definition selected by %s',
	async (policy) => {
		await setConfig(parent, {
			tools: [
				{ type: 'workflow', workflowId: 'published-workflow', workflow: 'Published display' },
			],
		});
		await publish(parent);
		await setConfig(parent, {
			tools: [{ type: 'workflow', workflowId: 'draft-workflow', workflow: 'Draft display' }],
		});
		const writer = new CapturingWriter();
		const result = await exporter.export({
			user: owner,
			writer,
			agentIds: [parent.id],
			versionPolicy: policy,
		});
		const selectedId = policy === 'latest' ? 'draft-workflow' : 'published-workflow';
		expect(
			result.workflowRequirements.map(({ referencedWorkflowId }) => referencedWorkflowId),
		).toEqual([selectedId]);
		const content = serializedAgentSchema.parse(
			JSON.parse(writer.files.find(({ path }) => path.endsWith('/agent.json'))!.content),
		);
		expect(content.config?.tools).toEqual([expect.objectContaining({ workflowId: selectedId })]);
	},
);

it('writes and resolves the prepared snapshot when the draft changes during export', async () => {
	await setConfig(parent, {
		tools: [{ type: 'workflow', workflowId: 'selected-workflow', workflow: 'Selected' }],
	});
	const adapter = Container.get(AgentExporter);
	const prepare = adapter.prepare.bind(adapter);
	vi.spyOn(adapter, 'prepare').mockImplementation(async (agent, policy) => {
		const snapshot = await prepare(agent, policy);
		await repository.update(agent.id, { schema: null });
		return snapshot;
	});
	const writer = new CapturingWriter();
	const result = await exporter.export({ user: owner, writer, agentIds: [parent.id] });
	expect(
		result.workflowRequirements.map(({ referencedWorkflowId }) => referencedWorkflowId),
	).toEqual(['selected-workflow']);
	const content = serializedAgentSchema.parse(
		JSON.parse(writer.files.find(({ path }) => path.endsWith('/agent.json'))!.content),
	);
	expect(content.config?.tools).toEqual([
		expect.objectContaining({ workflowId: 'selected-workflow' }),
	]);
});

it.each(['fail', 'reference-only', 'include-in-package'] as const)(
	'applies dependency policy %s to Agents and workflows',
	async (policy) => {
		const nested = await createWorkflow({ name: 'Nested workflow', nodes: [] }, otherProject);
		const workflow = await createWorkflow(
			{ name: 'Required workflow', nodes: [executeWorkflowNode(nested.id)] },
			otherProject,
		);
		await setConfig(parent, {
			subAgents: { agents: [{ agentId: child.id }] },
			tools: [{ type: 'workflow', workflowId: workflow.id, workflow: 'Display' }],
		});
		const run = Container.get(N8nPackagesService).exportPackageToWriter(
			{
				user: owner,
				agentIds: [parent.id],
				dependencyPolicy: policy,
			},
			new CapturingWriter(),
		);
		if (policy === 'fail') {
			await expect(run).rejects.toThrow(PackageExportBlockedError);
			return;
		}
		const { manifest } = await run;
		expect(manifest.agents?.map(({ id }) => id)).toEqual(
			policy === 'include-in-package' ? [parent.id, child.id] : [parent.id],
		);
		expect(manifest.workflows?.map(({ id }) => id) ?? []).toEqual(
			policy === 'include-in-package' ? [workflow.id, nested.id] : [],
		);
		expect(manifest.requirements?.workflows).toEqual([
			{ id: workflow.id, name: workflow.name, usedBy: [{ kind: 'agent', id: parent.id }] },
			...(policy === 'include-in-package'
				? [{ id: nested.id, name: nested.name, usedBy: [{ kind: 'workflow', id: workflow.id }] }]
				: []),
		]);
	},
);

it('skips an unpublished root but fails when an included Agent requires it', async () => {
	await setConfig(parent, { subAgents: { agents: [{ agentId: child.id }] } });
	await publish(parent);
	const skipped = await exporter.export({
		user: owner,
		writer: new CapturingWriter(),
		agentIds: [child.id],
		versionPolicy: 'ignore-unpublished',
	});
	expect(skipped.counts.agents).toBe(0);
	await expect(
		exporter.export({
			user: owner,
			writer: new CapturingWriter(),
			agentIds: [parent.id],
			versionPolicy: 'ignore-unpublished',
			dependencyPolicy: 'include-in-package',
		}),
	).rejects.toThrow(PackageExportBlockedError);
});

it.each([{ projectWorkflowIds: [] }, { projectWorkflowIds: ['selected_workflow'] }])(
	'does not expand a restricted project selection $projectWorkflowIds',
	async ({ projectWorkflowIds }) => {
		await createWorkflow({ id: 'selected_workflow', nodes: [] }, project);
		const result = await Container.get(N8nPackagesService).exportPackageToWriter(
			{ user: owner, projectIds: [project.id], projectWorkflowIds },
			new CapturingWriter(),
		);
		expect(result.manifest.agents).toBeUndefined();
		expect(result.manifest.workflows?.map(({ id }) => id) ?? []).toEqual(projectWorkflowIds);
		expect(result.counts.agents).toBe(0);
	},
);

it.each([undefined, true, false])(
	'exports project Agents with includeAgents=%s',
	async (includeAgents) => {
		const writer = new CapturingWriter();
		const result = await Container.get(N8nPackagesService).exportPackageToWriter(
			{ user: owner, projectIds: [project.id], includeAgents },
			writer,
		);
		expect(result.manifest.agents?.map(({ id }) => id) ?? []).toEqual(
			includeAgents === false ? [] : [parent.id],
		);
		expect(result.counts.agents).toBe(includeAgents === false ? 0 : 1);
		expect(writer.files.some(({ path }) => path.endsWith('/agent.json'))).toBe(
			includeAgents !== false,
		);
	},
);
