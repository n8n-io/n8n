import { AgentJsonConfigSchema, type AgentJsonConfig } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackageParser } from '../engine/n8n-package-parser';
import { AgentSelectionExporter } from '../entities/agent/agent-selection.exporter';
import { AgentExporter } from '../entities/agent/agent.exporter';
import { CredentialExporter } from '../entities/credential/credential.exporter';
import { FolderExporter } from '../entities/folder/folder.exporter';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '../entities/package-export.errors';
import { ProjectExporter } from '../entities/project/project.exporter';
import { mergeRequirements } from '../entities/requirements.types';
import { AutoIncludedWorkflowResolver } from '../entities/workflow/auto-included-workflow-resolver';
import { AutoIncludedWorkflowExporter } from '../entities/workflow/auto-included-workflow.exporter';
import { collectNodeTypeUsage } from '../entities/workflow/node-type-usage';
import { assertStaticSubWorkflowsIncluded } from '../entities/workflow/static-sub-workflow-requirements';
import { WorkflowDependencyResolver } from '../entities/workflow/workflow-dependency-resolver';
import { WorkflowRequirementExporter } from '../entities/workflow/workflow-requirement.exporter';
import { WorkflowExporter } from '../entities/workflow/workflow.exporter';
import { CapturingWriter } from '../io/__tests__/utils/capturing-writer';
import { DirectoryPackageReader } from '../io/directory/directory-package-reader';
import { DirectoryPackageWriter } from '../io/directory/directory-package-writer';
import type { PackageWriter } from '../io/package-writer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { PackageImportConfig } from '../n8n-packages.config';
import { N8nPackagesService } from '../n8n-packages.service';
import { packageManifestSchema } from '../spec/manifest.schema';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';
import { looseAgentsFixture } from './fixtures/agent-package-fixtures';
import { streamToBuffer } from './utils/tar-support';
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
	await Container.get(AgentTaskRepository).delete({});
	await Container.get(AgentTaskSnapshotRepository).delete({});
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
	const fixture = looseAgentsFixture();
	const agents: Agent[] = [];
	for (const [index, entry] of fixture.manifest.agents.entries()) {
		const content = serializedAgentSchema.parse(fixture.files[`${entry.target}/agent.json`]);
		const agent = await repository.save({
			id: content.id,
			name: content.name,
			projectId: index === 0 ? project.id : otherProject.id,
			schema: content.config,
			skills: content.skills,
			tools: content.tools,
			availableInMCP: content.availableInMCP,
			integrations: [],
			versionId: `${entry.id}_draft`,
			activeVersionId: null,
			revision: 0,
		});
		await Container.get(AgentTaskRepository).save(
			Object.entries(content.tasks).map(([id, task]) => ({ id, agentId: agent.id, ...task })),
		);
		agents.push(agent);
	}
	[parent, child] = agents;
});

afterEach(() => vi.restoreAllMocks());

async function setConfig(agent: Agent, config: Partial<AgentJsonConfig>) {
	const schema = AgentJsonConfigSchema.parse({ ...agent.schema, ...config });
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
	await Container.get(AgentTaskSnapshotRepository).saveForVersion(
		[...definition.tasks].map(([taskId, task]) => ({
			...task,
			timezone: task.timezone ?? null,
			taskId,
			enabled: false,
			versionId: history.versionId,
		})),
	);
	await repository.setActiveVersionFenced(agent.id, agent.revision, {
		activeVersionId: history.versionId,
		versionId: agent.versionId!,
	});
}

async function readRecords() {
	return await Promise.all([
		repository.find({ order: { id: 'ASC' } }),
		Container.get(AgentTaskRepository).find({ order: { id: 'ASC' } }),
		Container.get(WorkflowRepository).find({ order: { id: 'ASC' } }),
	]);
}

it.each(['loose', 'project'] as const)(
	'round-trips a %s selection with Agent and workflow cycles',
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
				...(parent.schema?.tools ?? []),
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
			{
				id: 'nested',
				name: 'Nested',
				nodes: [executeWorkflowNode(parent.id)],
				parentFolder: folder,
			},
			project,
		);
		const loose = await createWorkflow({ id: 'loose', name: 'Loose', nodes: [] }, project);
		await createWorkflow(
			{
				id: parent.id,
				name: 'Agent workflow',
				nodes: [executeWorkflowNode(nested.id)],
				settings: { errorWorkflow: nested.id },
			},
			otherProject,
		);
		await createWorkflow({ id: 'unrelated-workflow', name: 'Unrelated', nodes: [] }, otherProject);
		const before = await readRecords();
		const directory = await mkdtemp(path.join(tmpdir(), 'n8n-agent-selection-'));
		try {
			const archive = new TarPackageWriter();
			const looseWriter = new DirectoryPackageWriter(directory);
			const writer: PackageWriter = {
				async writeDirectory(target) {
					archive.writeDirectory(target);
					await looseWriter.writeDirectory(target);
				},
				async writeFile(target, content) {
					archive.writeFile(target, content);
					await looseWriter.writeFile(target, content);
				},
			};
			const common = {
				user,
				writer,
				includeTags: false,
				includeArchivedWorkflows: false,
				workflowVersionPolicy: 'latest' as const,
			};
			const projects =
				placement === 'project'
					? await Container.get(ProjectExporter).export({ ...common, projectIds: [project.id] })
					: undefined;
			const folders =
				placement === 'loose'
					? await Container.get(FolderExporter).export({ ...common, folderIds: [folder.id] })
					: undefined;
			const workflows =
				placement === 'loose'
					? await Container.get(WorkflowExporter).export({ ...common, workflowIds: [loose.id] })
					: undefined;
			const prepare = vi.spyOn(Container.get(AgentExporter), 'prepare');
			const agents = await exporter.export({
				user,
				writer,
				...(placement === 'project'
					? { projectIds: [project.id] }
					: { agentIds: [parent.id, parent.id], workflowIds: [loose.id], folderIds: [folder.id] }),
				projectTargetsById: projects?.projectTargetsById,
				missingAgentDependencyPolicy: 'include-in-package',
			});
			expect(prepare.mock.calls.map(([agent]) => agent.id)).toEqual([parent.id, child.id]);
			const initialWorkflows = [
				...(projects?.workflowEntries ?? []),
				...(folders?.workflowEntries ?? []),
				...(workflows?.entries ?? []),
			];
			const initialFolders = [...(projects?.folderEntries ?? []), ...(folders?.entries ?? [])];
			const initialProjects = [...(projects?.entries ?? []), ...agents.projectEntries];
			const workflowRequirements = await Container.get(WorkflowDependencyResolver).resolve({
				user,
				workflowIds: initialWorkflows.map(({ id }) => id),
				agentRequirements: agents.workflowRequirements,
				workflowVersionPolicy: 'latest',
			});
			const resolution = await Container.get(AutoIncludedWorkflowResolver).resolve({
				user,
				requirements: workflowRequirements,
				topLevelWorkflowIds: workflows?.entries.map(({ id }) => id) ?? [],
				folderWorkflowIds: folders?.workflowEntries.map(({ id }) => id) ?? [],
				projectWorkflowIds: projects?.workflowEntries.map(({ id }) => id) ?? [],
				includeTags: false,
				workflowVersionPolicy: 'latest',
			});
			const included = await Container.get(AutoIncludedWorkflowExporter).export({
				writer,
				workflows: resolution.autoIncludedWorkflows,
				existingWorkflowEntries: initialWorkflows,
				existingFolderEntries: initialFolders,
				existingProjectEntries: initialProjects,
				projectTargetsById: agents.projectTargetsById,
				includeTags: false,
			});
			const allWorkflows = [...initialWorkflows, ...included.workflowEntries];
			assertStaticSubWorkflowsIncluded(
				workflowRequirements,
				new Set(allWorkflows.map(({ id }) => id)),
			);
			const requirements = mergeRequirements(
				agents.requirements,
				projects?.requirements,
				folders?.requirements,
				workflows?.requirements,
				included.requirements,
			);
			const credentials = await Container.get(CredentialExporter).export({
				user,
				writer,
				requirements: requirements.credentials,
				credentialExportPolicy: 'expression-values-only',
			});
			const workflowManifest = await Container.get(WorkflowRequirementExporter).export({
				user,
				requirements: workflowRequirements,
				workflows: allWorkflows,
			});
			const manifest = packageManifestSchema.parse({
				...looseAgentsFixture().manifest,
				agents: agents.agentEntries,
				workflows: allWorkflows,
				folders: [...initialFolders, ...included.folderEntries],
				projects: [...initialProjects, ...included.projectEntries],
				requirements: {
					agents: agents.agentRequirements,
					workflows: workflowManifest.requirements,
					credentials: credentials.requirements,
					nodeTypes: collectNodeTypeUsage(requirements.nodeTypes),
				},
			});
			await writer.writeFile('manifest.json', JSON.stringify(manifest));
			expect(agents.agentIds).toEqual([parent.id, child.id]);
			expect(agents.counts).toEqual({ agents: 2 });
			expect(allWorkflows.map(({ id }) => id).sort()).toEqual(
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
			expect(manifest.projects?.map(({ id }) => id)).toEqual(
				placement === 'project' ? [project.id, otherProject.id] : [],
			);
			for (const entry of agents.agentEntries) {
				const projectId = entry.id === parent.id ? project.id : otherProject.id;
				const prefix =
					placement === 'project' ? `${agents.projectTargetsById.get(projectId)}/` : '';
				expect(entry.target.startsWith(`${prefix}agents/`)).toBe(true);
			}
			const limits = new PackageImportConfig();
			const archiveReader = new TarPackageReader(await streamToBuffer(archive.finalize()), limits);
			const directoryReader = new DirectoryPackageReader(directory, limits);
			await directoryReader.listEntries();
			const parser = Container.get(N8nPackageParser);
			for (const prefix of ['', ...(manifest.projects ?? []).map(({ target }) => `${target}/`)]) {
				const parsed = await parser.getAgents(archiveReader, prefix);
				expect(await parser.getAgents(directoryReader, prefix)).toEqual(parsed);
				for (const agent of parsed) {
					expect(agent.skills['shared-skill'].references?.[0].content).toContain(
						'Keep this reference text.',
					);
					expect(agent.tools.shared_tool.code).toContain('throw new Error');
					expect(Object.values(agent.tasks)[0].timezone).toBeNull();
				}
			}
			expect(await readRecords()).toEqual(before);
		} finally {
			await rm(directory, { recursive: true, force: true });
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

it.each(['latest', 'prefer-published', 'published-strict', 'ignore-unpublished'] as const)(
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
