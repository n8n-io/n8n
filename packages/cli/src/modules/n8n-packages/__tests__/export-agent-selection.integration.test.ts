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
import { AutoIncludedWorkflowResolver } from '../entities/workflow/auto-included-workflow-resolver';
import { assertStaticSubWorkflowsIncluded } from '../entities/workflow/static-sub-workflow-requirements';
import { WorkflowDependencyResolver } from '../entities/workflow/workflow-dependency-resolver';
import { WorkflowRequirementExporter } from '../entities/workflow/workflow-requirement.exporter';
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
	'selects a %s dependency graph without repeating Agents',
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
		const nested = await createWorkflow(
			{ id: 'nested', nodes: [executeWorkflowNode(parent.id)] },
			project,
		);
		await createWorkflow({ id: parent.id, nodes: [executeWorkflowNode(nested.id)] }, otherProject);
		const result = await exporter.export({
			user,
			writer: new CapturingWriter(),
			...(placement === 'project'
				? { projectIds: [project.id] }
				: { agentIds: [parent.id, parent.id], workflowIds: [nested.id] }),
			missingAgentDependencyPolicy: 'include-in-package',
		});
		expect(result.agentIds).toEqual([parent.id, child.id]);
		expect(result.counts.agents).toBe(2);
		expect(result.projectEntries.map(({ id }) => id)).toEqual(
			placement === 'project' ? [project.id, otherProject.id] : [],
		);
		for (const entry of result.agentEntries) {
			const projectId = entry.id === parent.id ? project.id : otherProject.id;
			const prefix = placement === 'project' ? `${result.projectTargetsById.get(projectId)}/` : '';
			expect(entry.target.startsWith(`${prefix}agents/`)).toBe(true);
		}
		const requirements = await Container.get(WorkflowDependencyResolver).resolve({
			user,
			workflowIds: [nested.id],
			agentRequirements: result.workflowRequirements,
			workflowVersionPolicy: 'latest',
		});
		expect(requirements).toEqual([
			{
				agentId: parent.id,
				projectId: project.id,
				referencedWorkflowId: parent.id,
				origin: placement === 'project' ? 'project' : 'top-level',
			},
			{ workflowId: nested.id, referencedWorkflowId: parent.id },
			{ workflowId: parent.id, referencedWorkflowId: nested.id },
		]);
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
			missingAgentDependencyPolicy: policy,
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
			missingAgentDependencyPolicy: 'include-in-package',
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
			missingAgentDependencyPolicy: policy,
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
			agentVersionPolicy: policy,
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
	'applies workflow policy %s independently of reference-only Agents',
	async (policy) => {
		const workflow = await createWorkflow({ name: 'Required workflow', nodes: [] }, otherProject);
		await setConfig(parent, {
			subAgents: { agents: [{ agentId: child.id }] },
			tools: [{ type: 'workflow', workflowId: workflow.id, workflow: 'Display' }],
		});
		const agents = await exporter.export({
			user: owner,
			writer: new CapturingWriter(),
			agentIds: [parent.id],
			missingAgentDependencyPolicy: 'reference-only',
		});
		expect(agents.agentIds).toEqual([parent.id]);
		const requirements = await Container.get(WorkflowDependencyResolver).resolve({
			user: owner,
			workflowIds: [],
			agentRequirements: agents.workflowRequirements,
			traversal: policy === 'reference-only' ? 'direct' : 'transitive',
			workflowVersionPolicy: 'latest',
		});
		if (policy === 'fail') {
			expect(() => assertStaticSubWorkflowsIncluded(requirements, new Set())).toThrow(
				PackageExportBlockedError,
			);
			return;
		}
		if (policy === 'reference-only') {
			const result = await Container.get(WorkflowRequirementExporter).export({
				user: owner,
				requirements,
				workflows: [],
			});
			expect(result.requirements).toEqual([
				{ id: workflow.id, name: workflow.name, usedBy: [{ kind: 'agent', id: parent.id }] },
			]);
			return;
		}
		const result = await Container.get(AutoIncludedWorkflowResolver).resolve({
			user: owner,
			requirements,
			topLevelWorkflowIds: [],
			folderWorkflowIds: [],
			projectWorkflowIds: [],
			includeTags: false,
			workflowVersionPolicy: 'latest',
		});
		expect(result.autoIncludedWorkflows.map(({ workflow }) => workflow.id)).toEqual([workflow.id]);
	},
);

it('skips an unpublished root but fails when an included Agent requires it', async () => {
	await setConfig(parent, { subAgents: { agents: [{ agentId: child.id }] } });
	await publish(parent);
	const skipped = await exporter.export({
		user: owner,
		writer: new CapturingWriter(),
		agentIds: [child.id],
		agentVersionPolicy: 'ignore-unpublished',
	});
	expect(skipped.counts.agents).toBe(0);
	await expect(
		exporter.export({
			user: owner,
			writer: new CapturingWriter(),
			agentIds: [parent.id],
			agentVersionPolicy: 'ignore-unpublished',
			missingAgentDependencyPolicy: 'include-in-package',
		}),
	).rejects.toThrow(PackageExportBlockedError);
});

it.each([{ projectWorkflowIds: [] }, { projectWorkflowIds: ['selected-workflow'] }])(
	'does not expand a restricted project selection $projectWorkflowIds',
	async ({ projectWorkflowIds }) => {
		const result = await exporter.export({
			user: owner,
			writer: new CapturingWriter(),
			projectIds: [project.id],
			projectWorkflowIds,
		});
		expect(result.agentIds).toEqual([]);
	},
);

it.each(['agentIds', 'workflowIds', 'folderIds'] as const)(
	'rejects whole projects mixed with %s',
	async (field) => {
		await expect(
			exporter.export({
				user: owner,
				writer: new CapturingWriter(),
				projectIds: [project.id],
				[field]: ['selected-id'],
			}),
		).rejects.toThrow(PackageExportBlockedError);
	},
);

it('leaves public project exports unchanged while Agents are enabled', async () => {
	const writer = new CapturingWriter();
	const result = await Container.get(N8nPackagesService).exportPackageToWriter(
		{ user: owner, projectIds: [project.id] },
		writer,
	);
	expect(result.manifest.agents).toBeUndefined();
	expect(writer.files.some(({ path }) => path.endsWith('/agent.json'))).toBe(false);
});
