import {
	AgentJsonConfigSchema,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { createMember, createOwner } from '@test-integration/db/users';
import { saveCredential } from '@test-integration/db/credentials';
import { createProjectVariable } from '@test-integration/db/variables';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ExportPackageRequest, WorkflowVersionPolicy } from '../n8n-packages.types';
import { serializedAgentSchema } from '../spec/serialized/agent.schema';
import { packageManifestSchema } from '../spec/manifest.schema';
import { readExport, streamToBuffer, type UnpackedEntry } from './utils/tar-support';
import { buildWorkflowCallingSubWorkflow } from './utils/test-builders';
import { importPackageRequest } from './fixtures/import-request';

let service: N8nPackagesService;
let owner: User;
let project: Project;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'agents', 'data-table']);
	await testDb.init();
	mockDataTableSizeValidator();
	service = Container.get(N8nPackagesService);
}, 60_000);

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await Container.get(AgentTaskSnapshotRepository).delete({});
	await Container.get(AgentTaskRepository).delete({});
	await Container.get(AgentRepository).delete({});
	await Container.get(AgentHistoryRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'Variables',
		'DataTable',
		'DataTableColumn',
		'ProjectRelation',
		'Project',
	]);
	await Container.get(VariablesService).updateCache();
	owner = await createOwner();
	project = await createTeamProject('Agent package project', owner);
});

afterEach(() => vi.restoreAllMocks());

function config(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return AgentJsonConfigSchema.parse({
		name: 'Package agent',
		model: '',
		instructions: 'Draft instructions',
		...overrides,
	});
}

async function createAgent(home: Project, overrides: Partial<Agent> = {}): Promise<Agent> {
	const repository = Container.get(AgentRepository);
	return await repository.save(
		repository.create({
			name: 'Package agent',
			projectId: home.id,
			schema: config(),
			integrations: [],
			skills: {},
			tools: {},
			availableInMCP: true,
			versionId: randomUUID(),
			activeVersionId: null,
			...overrides,
		}),
	);
}

function toolBody(code: string) {
	return {
		code,
		descriptor: {
			name: 'send_note',
			description: 'Send a note',
			systemInstruction: null,
			inputSchema: null,
			outputSchema: null,
			hasSuspend: false,
			hasResume: false,
			hasToMessage: false,
			requireApproval: true,
			providerOptions: null,
		},
	};
}

async function createCompleteAgent(home: Project): Promise<Agent> {
	const agent = await createAgent(home);
	const taskId = `task_${agent.id}`;
	agent.schema = config({
		skills: [{ type: 'skill', id: 'skill_shared', enabled: false }],
		tools: [{ type: 'custom', id: 'send_note', enabled: false }],
		tasks: [{ type: 'task', id: taskId, enabled: false }],
	});
	agent.skills = {
		skill_shared: {
			name: 'Triage',
			description: 'Triage incoming work',
			instructions: 'Draft skill',
			references: [{ path: 'references/rules.md', content: 'Draft reference' }],
		},
	};
	agent.tools = { send_note: toolBody('draft tool code') };
	await Container.get(AgentRepository).save(agent);
	await Container.get(AgentTaskRepository).save({
		id: taskId,
		agentId: agent.id,
		name: 'Draft task',
		objective: 'Draft objective',
		cronExpression: '0 8 * * *',
		timezone: 'Europe/Vienna',
	});
	return agent;
}

async function addPublishedVersion(agent: Agent): Promise<string> {
	const versionId = randomUUID();
	await Container.get(AgentHistoryRepository).save({
		versionId,
		agentId: agent.id,
		author: 'Package author',
		publishedById: owner.id,
		schema: {
			...agent.schema!,
			instructions: 'Published instructions',
			integrations: [{ type: 'n8n_chat', credentialId: '' }],
		},
		skills: {
			skill_shared: {
				name: 'Triage',
				description: 'Triage incoming work',
				instructions: 'Published skill',
				references: [{ path: 'references/rules.md', content: 'Published reference' }],
			},
		},
		tools: { send_note: toolBody('published tool code') },
	});
	await Container.get(AgentTaskSnapshotRepository).saveForVersion([
		{
			versionId,
			taskId: agent.schema!.tasks![0].id,
			enabled: false,
			name: 'Published task',
			objective: 'Published objective',
			cronExpression: '0 7 * * *',
			timezone: 'UTC',
		},
	]);
	await Container.get(AgentRepository).update(agent.id, {
		activeVersionId: versionId,
		integrations: [
			{
				type: 'slack',
				credentialId: 'channel_credential',
				settings: { messagingExperience: 'agent' },
			},
		],
	});
	return versionId;
}

function jsonFile(entries: UnpackedEntry[], path: string): Record<string, unknown> {
	const file = entries.find((entry) => entry.name === path);
	if (!file) throw new Error(`Missing package file ${path}`);
	return JSON.parse(file.content.toString());
}

async function exportAgents(agentIds: string[], options: Partial<ExportPackageRequest> = {}) {
	const result = await service.exportPackage({ user: owner, agentIds, ...options });
	return { ...(await readExport(result.stream)), counts: result.counts };
}

describe('agent package export', () => {
	it.each<WorkflowVersionPolicy>([
		'latest',
		'published-strict',
		'prefer-published',
		'ignore-unpublished',
	])('exports complete, consistent bodies with %s', async (agentVersionPolicy) => {
		const agent = await createCompleteAgent(project);
		const publishedId = await addPublishedVersion(agent);
		const result = await exportAgents([agent.id], { agentVersionPolicy });
		expect(packageManifestSchema.safeParse(result.manifest).success).toBe(true);
		expect(result.counts.agents).toBe(1);
		const target = result.manifest.agents![0].target;
		const exported = serializedAgentSchema.parse(jsonFile(result.entries, `${target}/agent.json`));
		const published = agentVersionPolicy !== 'latest';
		expect(exported.config?.instructions).toBe(
			published ? 'Published instructions' : 'Draft instructions',
		);
		expect(exported.config?.skills?.[0].enabled).toBe(false);
		expect(exported.config?.integrations).toEqual([
			{
				type: 'slack',
				credentialId: 'channel_credential',
				settings: { messagingExperience: 'agent' },
			},
			...(published ? [{ type: 'n8n_chat', credentialId: '' }] : []),
		]);
		expect(jsonFile(result.entries, `${exported.skills[0].target}/skill.json`)).toMatchObject({
			id: 'skill_shared',
			instructions: published ? 'Published skill' : 'Draft skill',
			references: [
				{
					path: 'references/rules.md',
					content: published ? 'Published reference' : 'Draft reference',
				},
			],
		});
		expect(jsonFile(result.entries, `${exported.tools[0].target}/tool.json`)).toMatchObject({
			id: 'send_note',
			...toolBody(published ? 'published tool code' : 'draft tool code'),
		});
		expect(jsonFile(result.entries, `${exported.tasks[0].target}/task.json`)).toEqual({
			id: agent.schema!.tasks![0].id,
			name: published ? 'Published task' : 'Draft task',
			objective: published ? 'Published objective' : 'Draft objective',
			cronExpression: published ? '0 7 * * *' : '0 8 * * *',
			timezone: published ? 'UTC' : 'Europe/Vienna',
		});
		expect(jsonFile(result.entries, `${target}/agent-metadata.json`)).toEqual({
			versionId: published ? publishedId : agent.versionId,
			publishedVersionId: publishedId,
		});
		expect(exported).not.toHaveProperty('revision');
		expect(exported).not.toHaveProperty('createdAt');
	});

	it.each<WorkflowVersionPolicy>([
		'latest',
		'published-strict',
		'prefer-published',
		'ignore-unpublished',
	])('handles an unpublished agent with %s', async (agentVersionPolicy) => {
		const agent = await createAgent(project);
		if (agentVersionPolicy === 'published-strict') {
			await expect(exportAgents([agent.id], { agentVersionPolicy })).rejects.toThrow(
				'have no published version',
			);
			return;
		}
		const result = await exportAgents([agent.id], { agentVersionPolicy });
		expect(result.manifest.agents?.map(({ id }) => id) ?? []).toEqual(
			agentVersionPolicy === 'ignore-unpublished' ? [] : [agent.id],
		);
	});

	it('keeps local asset IDs distinct and uses the same bytes for archive and directory exports', async () => {
		const first = await createCompleteAgent(project);
		const second = await createCompleteAgent(project);
		const result = await exportAgents([first.id, second.id, first.id]);
		expect(result.manifest.agents).toHaveLength(2);
		const targets = result.manifest.agents!.map(({ target }) => target);
		const definitions = targets.map((target) =>
			serializedAgentSchema.parse(jsonFile(result.entries, `${target}/agent.json`)),
		);
		expect(definitions.map((agent) => agent.tools[0].id)).toEqual(['send_note', 'send_note']);
		expect(definitions[0].tools[0].target).not.toBe(definitions[1].tools[0].target);
		const directory = await mkdtemp(join(tmpdir(), 'n8n-agent-export-'));
		try {
			await service.exportPackageToDirectory(
				{ user: owner, agentIds: [first.id, second.id] },
				{ targetDir: directory },
			);
			for (const entry of result.entries.filter(
				({ name, type }) => type === 'File' && name !== 'manifest.json',
			)) {
				expect(await readFile(join(directory, entry.name))).toEqual(entry.content);
			}
			const publicationId = randomUUID();
			await Container.get(AgentHistoryRepository).save({
				versionId: publicationId,
				agentId: first.id,
				schema: first.schema,
				author: 'Package author',
				tools: first.tools,
				skills: first.skills,
			});
			await Container.get(AgentRepository).update(first.id, {
				activeVersionId: publicationId,
				versionId: randomUUID(),
				revision: 7,
			});
			const changed = await exportAgents([first.id, second.id]);
			const contentFiles = (entries: UnpackedEntry[]) =>
				entries
					.filter(
						({ name, type }) =>
							type === 'File' && name !== 'manifest.json' && !name.endsWith('agent-metadata.json'),
					)
					.map(({ name, content }) => ({ name, content: content.toString() }));
			expect(contentFiles(changed.entries)).toEqual(contentFiles(result.entries));
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it.each(['skill', 'tool', 'task'])('rejects a missing referenced %s body', async (kind) => {
		const agent = await createCompleteAgent(project);
		if (kind === 'skill') await Container.get(AgentRepository).update(agent.id, { skills: {} });
		if (kind === 'tool') await Container.get(AgentRepository).update(agent.id, { tools: {} });
		if (kind === 'task') await Container.get(AgentTaskRepository).delete({ agentId: agent.id });
		await expect(exportAgents([agent.id])).rejects.toThrow(`missing ${kind}`);
	});

	it('includes agents in whole projects and keeps workflow-only selections and project shells empty of agents', async () => {
		const agent = await createCompleteAgent(project);
		const workflow = await createWorkflow({}, project);
		const request = { user: owner, projectIds: [project.id] };
		const result = await readExport((await service.exportPackage(request)).stream);
		expect(result.manifest.agents![0]).toMatchObject({
			id: agent.id,
			target: `${result.manifest.projects![0].target}/agents/package-agent-${agent.id}`,
		});
		for (const selection of [[], [workflow.id]]) {
			const selected = await readExport(
				(await service.exportPackage({ ...request, projectWorkflowIds: selection })).stream,
			);
			expect(selected.manifest.agents).toBeUndefined();
			expect(selected.manifest.workflows?.map(({ id }) => id) ?? []).toEqual(selection);
		}
		const workflowsOnly = await readExport(
			(await service.exportPackage({ ...request, projectAgentIds: [] })).stream,
		);
		expect(workflowsOnly.manifest.agents).toBeUndefined();
	});

	it('applies both dependency policies and stops at agent cycles', async () => {
		const first = await createAgent(project);
		const second = await createAgent(project);
		const nested = await createWorkflow({ name: 'Nested workflow' }, project);
		const workflow = await buildWorkflowCallingSubWorkflow({
			project,
			name: 'Agent workflow',
			subWorkflowId: nested.id,
		});
		await Container.get(AgentRepository).save({
			...first,
			schema: config({ subAgents: { agents: [{ agentId: second.id, enabled: false }] } }),
		});
		await Container.get(AgentRepository).save({
			...second,
			schema: config({
				subAgents: { agents: [{ agentId: first.id }] },
				tools: [
					{ type: 'workflow', workflow: workflow.name },
					{
						type: 'node',
						name: 'Call workflow',
						enabled: false,
						node: {
							nodeType: '@n8n/n8n-nodes-langchain.toolWorkflow',
							nodeTypeVersion: 2,
							nodeParameters: { workflowId: { __rl: true, mode: 'id', value: workflow.id } },
						},
					},
				],
			}),
		});
		await expect(exportAgents([first.id])).rejects.toThrow('agent dependencies not included');
		const reference = await exportAgents([first.id], {
			missingAgentDependencyPolicy: 'reference-only',
		});
		expect(reference.manifest.agents).toHaveLength(1);
		expect(reference.manifest.requirements?.agents).toEqual([
			{ id: second.id, name: second.name, usedByWorkflows: [], usedByAgents: [first.id] },
		]);
		await expect(
			exportAgents([first.id], { missingAgentDependencyPolicy: 'include-in-package' }),
		).rejects.toThrow('workflow dependencies not included');
		const workflowReference = await exportAgents([first.id], {
			missingAgentDependencyPolicy: 'include-in-package',
			missingWorkflowDependencyPolicy: 'reference-only',
		});
		expect(workflowReference.manifest.workflows).toBeUndefined();
		expect(workflowReference.manifest.requirements?.workflows).toEqual([
			{ id: workflow.id, name: workflow.name, usedByWorkflows: [], usedByAgents: [second.id] },
		]);
		const result = await exportAgents([first.id], {
			missingAgentDependencyPolicy: 'include-in-package',
			missingWorkflowDependencyPolicy: 'include-in-package',
		});
		expect(result.manifest.agents?.map(({ id }) => id)).toEqual([first.id, second.id]);
		expect(new Set(result.manifest.workflows?.map(({ id }) => id))).toEqual(
			new Set([workflow.id, nested.id]),
		);
		expect(result.manifest.requirements?.workflows).toEqual(
			expect.arrayContaining([
				{ id: workflow.id, name: workflow.name, usedByWorkflows: [], usedByAgents: [second.id] },
			]),
		);
		const exported = serializedAgentSchema.parse(
			jsonFile(result.entries, `${result.manifest.agents![1].target}/agent.json`),
		);
		expect(exported.config?.tools?.[0]).toMatchObject({ workflowId: workflow.id });
		const stored = await Container.get(AgentRepository).findOneByOrFail({ id: second.id });
		expect(stored.schema?.tools?.[0]).not.toHaveProperty('workflowId');
	});

	it('checks user export permissions and keeps inaccessible reference-only dependencies nameless', async () => {
		const user = await createMember();
		await linkUserToProject(user, project, 'project:viewer');
		const own = await createAgent(project);
		const privateProject = await createTeamProject('Private project', owner);
		const hidden = await createAgent(privateProject, { name: 'Hidden agent' });
		await Container.get(AgentRepository).save({
			...own,
			schema: config({ subAgents: { agents: [{ agentId: hidden.id }] } }),
		});
		await expect(exportAgents([hidden.id], { user })).rejects.toThrow(
			'not found or not accessible',
		);
		await expect(
			exportAgents([own.id], { user, missingAgentDependencyPolicy: 'include-in-package' }),
		).rejects.toThrow('not found or not accessible');
		const result = await exportAgents([own.id], {
			user,
			missingAgentDependencyPolicy: 'reference-only',
		});
		expect(result.manifest.requirements?.agents).toEqual([
			{ id: hidden.id, usedByWorkflows: [], usedByAgents: [own.id] },
		]);
		const chatUser = await createMember();
		await linkUserToProject(chatUser, project, 'project:chatUser');
		await expect(exportAgents([own.id], { user: chatUser })).rejects.toThrow(
			'not found or not accessible',
		);
	});

	it('collects node-tool dependencies and keeps workflow and agent usage separate for the same ID', async () => {
		const table = await Container.get(DataTableService).createDataTable(project.id, {
			name: 'Customers',
			columns: [{ name: 'email', type: 'string' }],
		});
		await createProjectVariable('API_URL', 'https://example.com', project);
		const agent = await createAgent(project, {
			schema: config({
				tools: [
					{
						type: 'node',
						name: 'Customers',
						enabled: false,
						node: {
							nodeType: 'n8n-nodes-base.dataTableTool',
							nodeTypeVersion: 1,
							nodeParameters: {
								dataTableId: { __rl: true, mode: 'id', value: table.id },
								value: '={{ $vars.API_URL }}',
							},
							credentials: {
								openAiApi: { id: null, name: 'Managed', __aiGatewayManaged: true },
								anotherApi: { id: MANAGED_CREDENTIAL_TOKEN, name: 'Managed' },
							},
						},
					},
				],
			}),
		});
		const workflow = await createWorkflow(
			{
				id: agent.id,
				nodes: [
					{
						id: 'node',
						name: 'Customers',
						type: 'n8n-nodes-base.dataTableTool',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							dataTableId: { __rl: true, mode: 'id', value: table.id },
							value: '={{ $vars.API_URL }}',
						},
					},
				],
			},
			project,
		);
		const selection = { workflowIds: [workflow.id] };
		await expect(
			exportAgents([agent.id], { ...selection, canExportVariableValues: false }),
		).rejects.toThrow('variable:list');
		const result = await exportAgents([agent.id], {
			...selection,
			includeVariableValues: false,
			canExportVariableValues: false,
		});
		expect(result.counts).toMatchObject({
			agents: 1,
			workflows: 1,
			dataTables: 1,
			variables: 1,
			credentials: 0,
		});
		const usage = { usedByWorkflows: [workflow.id], usedByAgents: [agent.id] };
		expect(result.manifest.requirements?.dataTables).toEqual([
			{ id: table.id, name: 'Customers', ...usage },
		]);
		expect(result.manifest.requirements?.variables).toEqual([{ name: 'API_URL', ...usage }]);
		expect(result.manifest.requirements?.nodeTypes).toEqual([
			{ type: 'n8n-nodes-base.dataTableTool', typeVersion: 1, ...usage },
		]);
		expect(result.manifest.requirements?.credentials).toBeUndefined();
		expect(
			jsonFile(result.entries, `${result.manifest.variables![0].target}/variable.json`),
		).toEqual({ name: 'API_URL', type: 'string' });
	});

	it('places included dependencies under their own projects', async () => {
		const otherProject = await createTeamProject('Dependency project', owner);
		const dependency = await createAgent(otherProject);
		const workflow = await createWorkflow({ name: 'Dependency workflow' }, otherProject);
		await createAgent(project, {
			schema: config({
				subAgents: { agents: [{ agentId: dependency.id }] },
				tools: [{ type: 'workflow', workflow: workflow.id, workflowId: workflow.id }],
			}),
		});
		const result = await readExport(
			(
				await service.exportPackage({
					user: owner,
					projectIds: [project.id],
					missingAgentDependencyPolicy: 'include-in-package',
					missingWorkflowDependencyPolicy: 'include-in-package',
				})
			).stream,
		);
		const target = result.manifest.projects!.find(({ id }) => id === otherProject.id)!.target;
		expect(result.manifest.agents!.find(({ id }) => id === dependency.id)!.target).toContain(
			`${target}/agents/`,
		);
		expect(result.manifest.workflows![0].target).toContain(`${target}/workflows/`);
	});

	it.each(['expression-values-only', 'no-values'] as const)(
		'uses %s for credentials and preserves ID-only requirements',
		async (credentialExportPolicy) => {
			const credential = await saveCredential(
				{
					name: 'Agent credential',
					type: 'httpHeaderAuth',
					data: { name: 'X-Auth', value: 'literal-secret', expression: '={{ $secrets.API_KEY }}' },
				},
				{ project, role: 'credential:owner' },
			);
			const agent = await createAgent(project, {
				schema: config({
					model: 'openai/gpt-4.1-mini',
					credential: credential.id,
					memory: {
						enabled: false,
						storage: 'n8n',
						episodicMemory: { enabled: true, credential: MANAGED_CREDENTIAL_TOKEN },
					},
				}),
				integrations: [
					{
						type: 'slack',
						credentialId: 'missing_channel',
						settings: { messagingExperience: 'agent' },
					},
				],
			});
			const result = await exportAgents([agent.id], { credentialExportPolicy });
			const file = jsonFile(
				result.entries,
				`${result.manifest.credentials![0].target}/credential.json`,
			);
			expect(file.data).toEqual(
				credentialExportPolicy === 'no-values'
					? undefined
					: { expression: '={{ $secrets.API_KEY }}' },
			);
			expect(JSON.stringify(result.entries.map(({ content }) => content.toString()))).not.toContain(
				'literal-secret',
			);
			expect(result.manifest.requirements?.credentials).toEqual(
				expect.arrayContaining([
					{ id: 'missing_channel', usedByWorkflows: [], usedByAgents: [agent.id] },
				]),
			);
			expect(
				result.manifest.requirements?.credentials?.some(
					({ id }) => id === MANAGED_CREDENTIAL_TOKEN,
				),
			).toBe(false);
		},
	);

	it('rejects agent imports before any entities are written', async () => {
		const agent = await createCompleteAgent(project);
		const workflow = await createWorkflow({}, project);
		const { stream } = await service.exportPackage({
			user: owner,
			agentIds: [agent.id],
			workflowIds: [workflow.id],
		});
		const packageBuffer = await streamToBuffer(stream);
		await expect(
			service.importPackage(
				importPackageRequest({ user: owner, packageBuffer, projectId: project.id }),
			),
		).rejects.toThrow('Packages containing agents cannot be imported yet');
		expect(await Container.get(AgentRepository).count()).toBe(1);
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	it('keeps workflow-only exports available when the agents module is disabled', async () => {
		const registry = Container.get(ModuleRegistry);
		const original = registry.isActive.bind(registry);
		vi.spyOn(registry, 'isActive').mockImplementation(
			(name) => name !== 'agents' && original(name),
		);
		const workflow = await createWorkflow({}, project);
		const result = await readExport(
			(await service.exportPackage({ user: owner, projectIds: [project.id] })).stream,
		);
		expect(result.manifest.workflows?.map(({ id }) => id)).toEqual([workflow.id]);
		await expect(exportAgents(['agent'])).rejects.toThrow('agents module is disabled');
	});
});
