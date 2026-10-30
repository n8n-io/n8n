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
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { InstanceSettings } from 'n8n-core';
import { DataTable } from 'n8n-nodes-base/nodes/DataTable/DataTable.node';
import { ExecuteWorkflow } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import { HttpRequest } from 'n8n-nodes-base/nodes/HttpRequest/HttpRequest.node';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { Readable } from 'node:stream';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import {
	looseAgentsFixture,
	projectAgentsFixture,
	writeAgentPackageFixture,
} from '@/modules/n8n-packages/__tests__/fixtures/agent-package-fixtures';
import { streamToBuffer } from '@/modules/n8n-packages/__tests__/utils/tar-support';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { serializedAgentSchema } from '@/modules/n8n-packages/spec/serialized/agent.schema';
import { createSkill, toSkillContent } from '@/modules/skills/testing';
import { serializedSkillSchema } from '@/modules/n8n-packages/spec/serialized/skill.schema';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';
import { createCredentials } from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { createProjectVariable } from '@test-integration/db/variables';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);
mockInstance(Telemetry);
mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
beforeAll(
	async () => await testModules.loadModules(['skills', 'n8n-packages', 'agents', 'data-table']),
);
const server = setupTestServer({
	endpointGroups: ['publicApi'],
	enabledFeatures: [
		'feat:projectRole:admin',
		'feat:projectRole:editor',
		'feat:projectRole:viewer',
		'feat:variables',
	],
	quotas: { 'quota:maxTeamProjects': 100, 'quota:maxVariables': 100 },
});
let owner: User;
let destination: Project;
let sourceProject: Project;
let sourceAgents: Agent[];
let agents: AgentRepository;
let tasks: AgentTaskRepository;

beforeAll(async () => {
	registerSkillUsage();
	agents = Container.get(AgentRepository);
	tasks = Container.get(AgentTaskRepository);
	Container.get(InstanceSettings).markAsLeader();
	await initNodeTypes({
		'n8n-nodes-base.dataTable': { type: new DataTable(), sourcePath: '' },
		'n8n-nodes-base.executeWorkflow': { type: new ExecuteWorkflow(), sourcePath: '' },
		'n8n-nodes-base.executeWorkflowTrigger': { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
		'n8n-nodes-base.httpRequest': { type: new HttpRequest(), sourcePath: '' },
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
			schema: storedAgentConfig({
				...config!,
				model: 'openai/gpt-4.1-mini',
				credential: AI_GATEWAY_MANAGED_TAG,
				instructions: 'Help with requests.',
				mcpServers: [],
				subAgents: { agents: [{ agentId: fixture.manifest.agents[1 - index].id }] },
			}),
		});
		const skill = serializedSkillSchema.parse(fixture.files[`skills/${entry.id}_skill/skill.json`]);
		await createSkill({
			id: skill.id,
			agentId: agent.id,
			source: 'agent',
			createdById: owner.id,
			content: toSkillContent(skill.skill, skill.frontmatter),
		});
		await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [
			{ skillId: skill.id },
		]);
		await tasks.save(
			Object.entries(taskDefinitions).map(([id, task]) => ({ id, agentId: agent.id, ...task })),
		);
		sourceAgents.push(agent);
	}
});

afterEach(async () => {
	vi.restoreAllMocks();
	await agents.delete({});
	await Container.get(DataTableService).deleteDataTableAll();
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'Variables',
		'ProjectRelation',
		'Project',
	]);
	await Container.get(VariablesService).updateCache();
});

async function download(
	selection: Partial<ExportPackageRequestDto> = { agentIds: [sourceAgents[0].id] },
) {
	const response = await server
		.publicApiAgentFor(owner)
		.post('/n8n-packages/export')
		.send({
			dependencyPolicy: 'include-in-package',
			versionPolicy: 'latest',
			credentialExportPolicy: 'no-values',
			...selection,
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
			idPolicy: 'source',
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
		workflowShares: await Container.get(SharedWorkflowRepository).find({
			order: { workflowId: 'ASC', projectId: 'ASC' },
		}),
		credentials: await Container.get(CredentialsRepository).find({ order: { id: 'ASC' } }),
		credentialShares: await Container.get(SharedCredentialsRepository).find({
			order: { credentialsId: 'ASC', projectId: 'ASC' },
		}),
		dataTables: await Container.get(DataTableRepository).find({ order: { id: 'ASC' } }),
		columns: await Container.get(DataTableColumnRepository).find({ order: { id: 'ASC' } }),
		variables: await Container.get(VariablesRepository).find({ order: { id: 'ASC' } }),
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
		const slackSettings = { messagingExperience: 'agent', onlyRespondWhenMentioned: true } as const;
		const sourceSlack = await createCredentials(
			{ name: 'Source Slack', type: 'slackApi', data: '' },
			sourceProject,
		);
		sourceAgents[0].integrations = [
			{ type: 'slack', credentialId: sourceSlack.id, settings: slackSettings },
		];
		await agents.save(sourceAgents[0]);
		const archive = await download(
			shape === 'project' ? { projectIds: [sourceProject.id] } : undefined,
		);
		const skillRefs = Container.get(AgentSkillRefsService);
		const sourceSkills = await Promise.all(
			sourceAgents.map(async (agent) => await skillRefs.readDraft(agent, {})),
		);
		await agents.delete({ projectId: sourceProject.id });
		await Container.get(WorkflowRepository).delete(workflow.id);
		if (shape === 'project') {
			await Container.get(ProjectRepository).delete(sourceProject.id);
		}
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const response = await upload(archive, { bindings });
		expect(response.statusCode).toBe(200);
		const result = ImportResultDto.parse(response.body);
		expect(result.agents).toHaveLength(2);
		expect(result.counts.agents).toEqual({ created: 2, updated: 0, skipped: 0 });
		const projectId = shape === 'project' ? sourceProject.id : destination.id;
		if (shape === 'project')
			expect(result.projects).toMatchObject([{ localId: projectId, status: 'created' }]);
		for (const [index, source] of sourceAgents.entries()) {
			const localId = result.bindings.agents[source.id];
			expect(localId).toBe(source.id);
			expect(response.body.agents).toContainEqual({
				sourceAgentId: source.id,
				localId,
				name: source.name,
				projectId,
				activeVersionId: null,
				status: 'created',
				publishing: { state: 'unchanged' },
				channels:
					index === 0
						? [
								{
									type: 'slack',
									status: 'setup-required',
									reason: 'new-channel',
									setupUrl: expect.stringContaining(`/projects/${projectId}/agents/${localId}`),
								},
							]
						: [],
			});
			const saved = await agents.findById(localId);
			expect(saved).toMatchObject({
				id: source.id,
				tools: source.tools,
				availableInMCP: source.availableInMCP,
				schema: {
					credential: index === 0 ? credentialId : AI_GATEWAY_MANAGED_TAG,
					subAgents: { agents: [{ agentId: result.bindings.agents[sourceAgents[1 - index].id] }] },
				},
			});
			// The channel settings travel; the source credential does not connect the channel.
			expect(saved!.integrations).toEqual(
				index === 0 ? [{ type: 'slack', credentialId: '', settings: slackSettings }] : [],
			);
			const destinationCredentials = await Container.get(SharedCredentialsRepository).find({
				where: { projectId },
				relations: { credentials: true },
			});
			// A credential that only a channel uses is neither imported nor stubbed.
			expect(destinationCredentials.map(({ credentials }) => credentials.type)).not.toContain(
				'slackApi',
			);
			expect(await skillRefs.readDraft({ id: localId }, {})).toEqual(sourceSkills[index]);
			const [task] = await tasks.findByAgentId(localId);
			expect(task).toMatchObject({
				id: `${source.id}_task`,
				objective: 'Summarize the open requests.',
			});
			expect(saved!.schema!.tasks![0].id).toBe(task.id);
			const history = await Container.get(AgentHistoryRepository).findByVersionAndAgentId(
				saved!.versionId!,
				localId,
			);
			expect(history).not.toBeNull();
			expect(await Container.get(AgentDefinitionService).readVersion(history!)).toMatchObject({
				skills: sourceSkills[index].skills,
				tools: source.tools,
				tasks: new Map([[task.id, expect.objectContaining({ objective: task.objective })]]),
			});
		}
		expect(
			(await agents.findById(result.bindings.agents[sourceAgents[0].id]))!.schema!.tools,
		).toContainEqual(
			expect.objectContaining({ workflowId: result.bindings.workflows[workflow.id] }),
		);
		expect(result.bindings.agents[workflow.id]).toBe(result.bindings.workflows[workflow.id]);
		expect(emit).toHaveBeenCalledWith(
			'n8n-package-imported',
			expect.objectContaining({
				agentIds: result.agents.map(({ localId }) => localId),
				counts: expect.objectContaining(result.counts),
				options: expect.objectContaining({
					conflictPolicy: 'new-version',
					workflowConflictPolicy: 'new-version',
					workflowIdPolicy: 'source',
					agentIdPolicy: 'source',
				}),
			}),
		);
	},
);

it.each([
	'available',
	'missing-agent',
	'inaccessible-agent',
	'missing-workflow',
	'inaccessible-workflow',
] as const)('imports bundled and existing dependencies when references are %s', async (state) => {
	const existingChild = await agents.save({
		id: 'existing-child',
		name: 'Existing child',
		projectId: destination.id,
		schema: null,
	});
	const existingWorkflow = await createWorkflow(
		{ name: 'Existing lookup', nodes: [] },
		destination,
	);
	const sourceCredential = await createCredentials(
		{ name: 'Shared model', type: 'openAiApi', data: '' },
		sourceProject,
	);
	const destinationCredential = await createCredentials(
		{ name: 'Shared model', type: 'openAiApi', data: '' },
		destination,
	);
	const [parent, bundledChild] = sourceAgents;
	parent.schema!.subAgents = {
		agents: [{ agentId: bundledChild.id }, { agentId: existingChild.id }],
	};
	parent.schema!.tools = [
		{ type: 'workflow', workflowId: existingWorkflow.id, workflow: existingWorkflow.name },
	];
	for (const agent of sourceAgents) {
		agent.schema!.credential = sourceCredential.id;
		await agents.save(agent);
	}
	const archive = await download({
		agentIds: sourceAgents.map(({ id }) => id),
		dependencyPolicy: 'reference-only',
	});
	await agents.delete({ projectId: sourceProject.id });
	if (state === 'missing-agent') await agents.delete(existingChild.id);
	if (state === 'inaccessible-agent')
		await agents.update(existingChild.id, { projectId: sourceProject.id });
	if (state === 'missing-workflow')
		await Container.get(WorkflowRepository).delete(existingWorkflow.id);
	if (state === 'inaccessible-workflow')
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: existingWorkflow.id },
			{ projectId: sourceProject.id },
		);
	const before = await records();
	const response = await upload(archive, { credentialMatchingMode: 'name-and-type' });
	if (state !== 'available') {
		expect(response.statusCode).toBe(422);
		expect(response.body.issues).toContainEqual(
			expect.objectContaining({
				type: 'agent-dependency-unresolved',
				sourceAgentId: parent.id,
				dependencyType: state.endsWith('agent') ? 'agent' : 'workflow',
				referenceId: state.endsWith('agent') ? existingChild.id : existingWorkflow.id,
				reason: state === 'inaccessible-workflow' ? 'inaccessible' : 'missing',
			}),
		);
		expect(await records()).toEqual(before);
		return;
	}
	expect(response.statusCode).toBe(200);
	const result = ImportResultDto.parse(response.body);
	expect(result.counts.agents).toEqual({ created: 2, updated: 0, skipped: 0 });
	expect(result.workflows).toEqual([]);
	expect(result.bindings.credentials[sourceCredential.id]).toBe(destinationCredential.id);
	expect(await agents.findById(parent.id)).toMatchObject({
		projectId: destination.id,
		schema: {
			credential: destinationCredential.id,
			subAgents: { agents: [{ agentId: bundledChild.id }, { agentId: existingChild.id }] },
			tools: [{ workflowId: existingWorkflow.id }],
		},
	});
	expect(await agents.findById(bundledChild.id)).toMatchObject({
		projectId: destination.id,
		schema: {
			credential: destinationCredential.id,
			subAgents: { agents: [{ agentId: parent.id }] },
		},
	});
	expect(await agents.findByProjectId(destination.id)).toHaveLength(3);
	const after = await records();
	expect(after.agents.find(({ id }) => id === existingChild.id)).toEqual(before.agents[0]);
	expect(after.workflows).toEqual(before.workflows);
	expect(after.workflowShares).toEqual(before.workflowShares);
	expect(after.credentials).toEqual(before.credentials);
	expect(after.credentialShares).toEqual(before.credentialShares);
});

it('imports an Agent dependency chain through a child Agent and nested workflows', async () => {
	const credential = await createCredentials(
		{ name: 'Lookup account', type: 'httpHeaderAuth', data: '' },
		sourceProject,
	);
	const nested = await createWorkflow(
		{
			name: 'Fetch records',
			nodes: [
				{
					id: 'fetch',
					name: 'Fetch',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0],
					parameters: {
						url: 'https://example.com/records',
						authentication: 'genericCredentialType',
						genericAuthType: 'httpHeaderAuth',
					},
					credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
				},
			],
		},
		sourceProject,
	);
	const workflow = await createWorkflow(
		{
			name: 'Lookup records',
			nodes: [
				{
					id: 'nested',
					name: 'Fetch records',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: { workflowId: { __rl: true, value: nested.id, mode: 'list' } },
				},
			],
		},
		sourceProject,
	);
	const [parent, child] = sourceAgents;
	child.schema!.subAgents = { agents: [] };
	child.schema!.tools = [{ type: 'workflow', workflowId: workflow.id, workflow: workflow.name }];
	await agents.save(child);
	const archive = await download();
	await agents.delete({ projectId: sourceProject.id });
	await Container.get(WorkflowRepository).delete([workflow.id, nested.id]);
	await Container.get(CredentialsRepository).delete(credential.id);
	const response = await upload(archive, { credentialMissingMode: 'create-stub' });
	expect(response.statusCode).toBe(200);
	const result = ImportResultDto.parse(response.body);
	expect(result.counts.agents).toEqual({ created: 2, updated: 0, skipped: 0 });
	expect(result.workflows.map(({ localId }) => localId).sort()).toEqual(
		[workflow.id, nested.id].sort(),
	);
	expect(await agents.findById(parent.id)).toMatchObject({
		projectId: destination.id,
		schema: { subAgents: { agents: [{ agentId: child.id }] } },
	});
	expect(await agents.findById(child.id)).toMatchObject({
		projectId: destination.id,
		schema: { tools: [{ workflowId: workflow.id }] },
	});
	expect(
		await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id }),
	).toMatchObject({
		nodes: [{ parameters: { workflowId: { value: nested.id } } }],
	});
	const credentialId = result.bindings.credentials[credential.id];
	expect(await Container.get(WorkflowRepository).findOneByOrFail({ id: nested.id })).toMatchObject({
		nodes: [{ credentials: { httpHeaderAuth: { id: credentialId } } }],
	});
	expect(
		await Container.get(SharedWorkflowRepository).find({ where: { projectId: destination.id } }),
	).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ workflowId: workflow.id }),
			expect.objectContaining({ workflowId: nested.id }),
		]),
	);
	expect(
		await Container.get(SharedCredentialsRepository).findOneBy({
			credentialsId: credentialId,
			projectId: destination.id,
		}),
	).toMatchObject({ role: 'credential:owner' });
	expect(await Container.get(CredentialsRepository).findOneBy({ id: credentialId })).toMatchObject({
		name: credential.name,
		type: credential.type,
	});
	expect(result.credentials.stubbed).toEqual([credential.id]);
	expect(await Container.get(WorkflowRepository).count()).toBe(2);
	expect(await Container.get(CredentialsRepository).count()).toBe(1);
});

it.each(['create', 'missing-credential', 'missing-table', 'missing-variable'] as const)(
	'imports Agent node-tool resources under %s',
	async (scenario) => {
		const credential = await createCredentials(
			{ name: 'Records account', type: 'httpHeaderAuth', data: '' },
			sourceProject,
		);
		const tables = Container.get(DataTableService);
		const table = await tables.createDataTable(sourceProject.id, {
			name: 'Records',
			columns: [{ name: 'title', type: 'string' }],
		});
		const variable = await createProjectVariable(
			'RECORDS_URL',
			'https://example.com/records',
			sourceProject,
		);
		const [agent] = sourceAgents;
		agent.schema!.subAgents = { agents: [] };
		agent.schema!.tools = [
			{
				type: 'node',
				name: 'Fetch records',
				node: {
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4.2,
					nodeParameters: {
						url: '={{ $vars.RECORDS_URL }}',
						authentication: 'genericCredentialType',
						genericAuthType: 'httpHeaderAuth',
					},
					credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
				},
			},
			{
				type: 'node',
				name: 'Read records',
				node: {
					nodeType: 'n8n-nodes-base.dataTable',
					nodeTypeVersion: 1,
					nodeParameters: {
						resource: 'row',
						operation: 'get',
						dataTableId: { __rl: true, value: table.id, mode: 'list' },
					},
				},
			},
		];
		await agents.save(agent);
		const archive = await download();
		await agents.delete({ projectId: sourceProject.id });
		await Container.get(CredentialsRepository).delete(credential.id);
		await tables.deleteDataTable(table.id, sourceProject.id);
		await Container.get(VariablesRepository).delete(variable.id);
		await Container.get(VariablesService).updateCache();
		const before = await records();
		const response = await upload(archive, {
			credentialMissingMode: scenario === 'missing-credential' ? 'must-preexist' : 'create-stub',
			dataTableMissingMode: scenario === 'missing-table' ? 'must-preexist' : 'create',
			variableMissingMode: scenario === 'missing-variable' ? 'must-preexist' : 'create-with-value',
			variableParentPolicy: 'project',
		});
		if (scenario !== 'create') {
			expect(response.statusCode).toBe(422);
			const issueType = {
				'missing-credential': 'credential-unresolved',
				'missing-table': 'data-table-unresolved',
				'missing-variable': 'variable-unresolved',
			}[scenario];
			expect(response.body.issues).toContainEqual(
				expect.objectContaining({
					type: issueType,
					usedBy: [{ kind: 'agent', id: agent.id }],
				}),
			);
			expect(await records()).toEqual(before);
			return;
		}
		expect(response.statusCode).toBe(200);
		const result = ImportResultDto.parse(response.body);
		const credentialId = result.bindings.credentials[credential.id];
		expect(await agents.findById(agent.id)).toMatchObject({
			projectId: destination.id,
			schema: {
				tools: [
					{
						node: {
							nodeParameters: { url: '={{ $vars.RECORDS_URL }}' },
							credentials: { httpHeaderAuth: { id: credentialId } },
						},
					},
					{ node: { nodeParameters: { dataTableId: { value: table.id } } } },
				],
			},
		});
		expect(await tables.getOne(table.id, destination.id)).toMatchObject({
			name: table.name,
			columns: table.columns.map(({ id, name, type, index }) => ({ id, name, type, index })),
		});
		expect(await Container.get(VariablesRepository).find({ relations: ['project'] })).toMatchObject(
			[{ key: variable.key, value: variable.value, project: { id: destination.id } }],
		);
		expect(await Container.get(CredentialsRepository).find()).toMatchObject([
			{ id: credentialId, name: credential.name, type: credential.type },
		]);
		expect(await Container.get(SharedCredentialsRepository).find()).toMatchObject([
			{ credentialsId: credentialId, projectId: destination.id, role: 'credential:owner' },
		]);
		expect(result.counts.agents).toEqual({ created: 1, updated: 0, skipped: 0 });
		expect(await Container.get(DataTableRepository).count()).toBe(1);
	},
);

it('shares conflict, ID, and publication policies across mixed content', async () => {
	const workflow = await addWorkflowDependency();
	const archive = await download();
	await agents.delete({ projectId: sourceProject.id });
	await Container.get(WorkflowRepository).delete(workflow.id);
	const created = await upload(archive, {
		publishingPolicy: 'publish-all',
	});
	expect(created.statusCode).toBe(200);
	const initial = ImportResultDto.parse(created.body);
	expect(initial.bindings.workflows[workflow.id]).toBe(workflow.id);
	expect(initial.bindings.agents[workflow.id]).toBe(workflow.id);
	expect(initial.workflows[0].publishing.state).toBe('published');
	expect(initial.agents.map(({ publishing }) => publishing.state)).toEqual([
		'published',
		'published',
	]);
	const updated = await upload(archive, {
		idPolicy: 'source',
		publishingPolicy: 'unpublish-all',
	});
	expect(updated.statusCode).toBe(200);
	expect(updated.body.bindings).toEqual(initial.bindings);
	expect(updated.body.counts.agents).toEqual({ created: 0, updated: 2, skipped: 0 });
	expect(updated.body.workflows[0]).toMatchObject({
		status: 'updated',
		publishing: { state: 'unpublished' },
	});
	expect(updated.body.agents).toMatchObject([
		{ status: 'updated', publishing: { state: 'unpublished' } },
		{ status: 'updated', publishing: { state: 'unpublished' } },
	]);
	for (const { localId } of initial.agents) {
		const saved = await agents.findById(localId);
		const versions = await Container.get(AgentHistoryRepository).findByAgentId(localId, 10, 0);
		expect(versions).toHaveLength(2);
		expect(versions.map(({ versionId }) => versionId)).toContain(saved!.versionId);
	}
	const before = await records();
	const skipped = await upload(archive, {
		conflictPolicy: 'skip',
		publishingPolicy: 'publish-all',
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
	await agents.delete({ projectId: sourceProject.id });
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
		{ conflictPolicy: 'skip', publishingPolicy: 'publish-all' },
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
		await agents.delete({ projectId: sourceProject.id });
		if (action === 'update' || action === 'unpublish') {
			expect((await upload(archive, { publishingPolicy: 'publish-all' })).statusCode).toBe(200);
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
		const publishingPolicy = action === 'unpublish' ? 'unpublish-all' : 'publish-all';
		const before = await records();
		const response = await upload(archive, { publishingPolicy }, caller);
		expect(response.statusCode).toBe(403);
		expect(await records()).toEqual(before);
	},
);

it.each(['project:viewer', 'project:chatUser'] as const)(
	'rejects an import for %s despite API-key grants',
	async (role) => {
		const archive = await download();
		await agents.delete({ projectId: sourceProject.id });
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
	await agents.delete({ projectId: sourceProject.id });
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
	const archive = await download();
	await agents.delete({ projectId: sourceProject.id });
	const response = await upload(archive, { publishingPolicy: 'publish-all' });
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

it('blocks occupied Agent IDs without moving the source Agents', async () => {
	const archive = await download();
	const before = await records();
	const response = await upload(archive);
	expect(response.statusCode).toBe(409);
	expect(response.body.issues).toContainEqual({
		type: 'agent-conflict',
		kind: 'id',
		sourceAgentId: sourceAgents[0].id,
		projectId: destination.id,
		targetIds: [sourceAgents[0].id],
	});
	expect(await records()).toEqual(before);
	expect(await agents.findByProjectId(destination.id)).toEqual([]);
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
