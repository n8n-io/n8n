import {
	AgentJsonConfigSchema,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { ModuleRegistry, LicenseState } from '@n8n/backend-common';
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
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { Telemetry } from '@/telemetry';
import { CredentialTypes } from '@/credential-types';

import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { createOwner, createMember } from '@test-integration/db/users';
import { saveCredential } from '@test-integration/db/credentials';
import { initNodeTypes } from '@test-integration/utils';
import { LicenseMocker } from '@test-integration/license';

import { N8nPackagesService } from '../n8n-packages.service';
import type {
	ExportPackageRequest,
	ImportPackageRequest,
	WorkflowPublishingPolicy,
} from '../n8n-packages.types';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { importPackageRequest } from './fixtures/import-request';
import { streamToBuffer, unpackTar, type UnpackedEntry } from './utils/tar-support';

mockInstance(Telemetry);

let service: N8nPackagesService;
let owner: User;
let source: Project;
let target: Project;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'agents']);
	await testDb.init();
	await initNodeTypes();
	mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
	const license = new LicenseMocker();
	license.enable('feat:projectRole:admin');
	license.setQuota('quota:maxTeamProjects', -1);
	license.mockLicenseState(Container.get(LicenseState));
	service = Container.get(N8nPackagesService);
}, 60_000);

afterAll(async () => await testDb.terminate());

afterEach(() => vi.restoreAllMocks());

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
		'ProjectRelation',
		'Project',
	]);
	owner = await createOwner();
	source = await createTeamProject('Source', owner);
	target = await createTeamProject('Target', owner);
	// Exercise publication persistence without a live model or scheduler.
	vi.spyOn(
		Container.get(AgentValidationService),
		'validateAgentEntityConfiguration',
	).mockResolvedValue({ status: 'valid', issues: [] });
	vi.spyOn(Container.get(AgentTaskService), 'requestReconcile').mockResolvedValue(undefined);
});

function config(overrides: Partial<AgentJsonConfig> = {}) {
	return AgentJsonConfigSchema.parse({
		name: 'Package agent',
		model: 'openai/gpt-4.1-mini',
		instructions: 'Authored instructions',
		...overrides,
	});
}

async function createAgent(overrides: Partial<Agent> = {}, project = source) {
	const repository = Container.get(AgentRepository);
	return await repository.save(
		repository.create({
			name: 'Package agent',
			projectId: project.id,
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

async function completeAgent() {
	const taskId = randomUUID().replaceAll('-', '');
	const agent = await createAgent({
		schema: config({
			skills: [{ type: 'skill', id: 'local_skill', enabled: false }],
			tools: [{ type: 'custom', id: 'local_tool', enabled: false }],
			tasks: [{ type: 'task', id: taskId, enabled: true }],
		}),
		skills: {
			local_skill: {
				name: 'Triage',
				description: 'Triage incoming work',
				instructions: 'Use these rules',
				references: [{ path: 'references/rules.md', content: 'Reference text' }],
			},
		},
		tools: {
			local_tool: {
				code: 'export default () => "hello";',
				descriptor: {
					name: 'hello',
					description: 'Say hello',
					systemInstruction: null,
					inputSchema: null,
					outputSchema: null,
					hasSuspend: false,
					hasResume: false,
					hasToMessage: false,
					requireApproval: true,
					providerOptions: null,
				},
			},
		},
	});
	await Container.get(AgentTaskRepository).save({
		id: taskId,
		agentId: agent.id,
		name: 'Daily report',
		objective: 'Write the report',
		cronExpression: '0 8 * * *',
		timezone: 'Europe/Vienna',
	});
	return agent;
}

async function exportAgents(ids: string[], options: Partial<ExportPackageRequest> = {}) {
	const result = await service.exportPackage({ user: owner, agentIds: ids, ...options });
	return await streamToBuffer(result.stream);
}

async function importAgents(packageBuffer: Buffer, options: Partial<ImportPackageRequest> = {}) {
	return await service.importPackage(
		importPackageRequest({
			user: owner,
			projectId: target.id,
			workflowConflictPolicy: 'new-version',
			packageBuffer,
			...options,
		}),
	);
}

async function rewritePackage(
	buffer: Buffer,
	rewrite: (entry: UnpackedEntry) => Buffer | undefined,
) {
	const writer = new TarPackageWriter();
	for (const entry of await unpackTar(buffer)) {
		if (entry.type !== 'File') continue;
		const content = rewrite(entry);
		if (content) writer.writeFile(entry.name, content);
	}
	return await streamToBuffer(writer.finalize());
}

describe('Agent package import', () => {
	it('restores source IDs and all authored bodies, then updates or skips repeat imports', async () => {
		const agent = await completeAgent();
		const tasks = await Container.get(AgentTaskRepository).findByAgentId(agent.id);
		const packageBuffer = await exportAgents([agent.id]);
		await Container.get(AgentRepository).delete(agent.id);
		const event = vi.spyOn(Container.get(EventService), 'emit');
		const result = await importAgents(packageBuffer, { apiKeyScopes: ['agent:import'] });
		expect(result.agents).toEqual([
			expect.objectContaining({
				sourceAgentId: agent.id,
				localId: agent.id,
				projectId: target.id,
				activeVersionId: null,
				status: 'created',
			}),
		]);
		const imported = await Container.get(AgentRepository).findOneByOrFail({ id: agent.id });
		expect(imported).toMatchObject({
			sourceAgentId: agent.id,
			schema: agent.schema,
			skills: agent.skills,
			tools: agent.tools,
			availableInMCP: true,
		});
		expect(await Container.get(AgentTaskRepository).findByAgentId(agent.id)).toMatchObject(
			tasks.map(({ id, name, objective, cronExpression, timezone }) => ({
				id,
				name,
				objective,
				cronExpression,
				timezone,
			})),
		);
		expect(await Container.get(AgentHistoryRepository).count()).toBe(0);
		expect(event).toHaveBeenCalledWith(
			'n8n-package-imported',
			expect.objectContaining({
				agentIds: [agent.id],
				counts: expect.objectContaining({ agents: { created: 1, updated: 0, skipped: 0 } }),
			}),
		);

		await Container.get(AgentRepository).update(agent.id, { name: 'Local name' });
		expect(
			(await importAgents(packageBuffer, { agentConflictPolicy: 'skip' })).agents[0],
		).toMatchObject({ name: 'Local name', status: 'skipped' });
		expect((await importAgents(packageBuffer)).agents[0]).toMatchObject({
			name: agent.name,
			status: 'updated',
			localId: agent.id,
		});
		expect(await Container.get(AgentRepository).countBy({ projectId: target.id })).toBe(1);
	});

	it('rebinds cycles, workflow tools, credentials and global task IDs when assigning new agent IDs', async () => {
		const first = await completeAgent();
		const second = await completeAgent();
		const workflow = await createWorkflow({}, source);
		const credential = await saveCredential(
			{ name: 'Source credential', type: 'openAiApi', data: { apiKey: 'source-value' } },
			{ project: source, role: 'credential:owner' },
		);
		const localCredential = await saveCredential(
			{ name: 'Target credential', type: 'openAiApi', data: { apiKey: 'target-value' } },
			{ project: target, role: 'credential:owner' },
		);
		await Container.get(AgentRepository).save({
			...first,
			schema: config({
				...first.schema!,
				credential: credential.id,
				subAgents: { agents: [{ agentId: second.id, enabled: false }] },
				tools: [
					...first.schema!.tools!,
					{
						type: 'workflow',
						name: 'Run',
						workflow: workflow.id,
						workflowId: workflow.id,
						enabled: false,
					},
				],
			}),
		});
		await Container.get(AgentRepository).save({
			...second,
			schema: config({ ...second.schema!, subAgents: { agents: [{ agentId: first.id }] } }),
		});
		const packageBuffer = await exportAgents([first.id], {
			missingAgentDependencyPolicy: 'include-in-package',
			missingWorkflowDependencyPolicy: 'include-in-package',
		});
		const options: Partial<ImportPackageRequest> = {
			agentIdPolicy: 'new',
			bindings: { credentials: new Map([[credential.id, localCredential.id]]) },
		};
		const result = await importAgents(packageBuffer, options);
		const firstId = result.bindings.agents[first.id];
		const secondId = result.bindings.agents[second.id];
		expect(firstId).not.toBe(first.id);
		const imported = await Container.get(AgentRepository).findOneByOrFail({ id: firstId });
		expect(imported.schema).toMatchObject({
			credential: localCredential.id,
			subAgents: { agents: [{ agentId: secondId }] },
			tools: [
				first.schema!.tools![0],
				expect.objectContaining({ workflowId: result.bindings.workflows[workflow.id] }),
			],
		});
		expect(
			(await Container.get(AgentRepository).findOneByOrFail({ id: secondId })).schema?.subAgents
				?.agents?.[0].agentId,
		).toBe(firstId);
		const task = (await Container.get(AgentTaskRepository).findByAgentId(firstId))[0];
		expect(task.id).not.toBe(first.schema!.tasks![0].id);
		expect(imported.schema?.tasks?.[0].id).toBe(task.id);
		expect((await importAgents(packageBuffer, options)).bindings).toEqual(result.bindings);
		expect((await Container.get(AgentTaskRepository).findByAgentId(firstId))[0].id).toBe(task.id);
		expect(await Container.get(CredentialsRepository).count()).toBe(2);
	});

	it('imports agents in whole projects and preserves workflow-only selection imports', async () => {
		const agent = await completeAgent();
		const workflow = await createWorkflow({}, source);
		const packageBuffer = await streamToBuffer(
			(await service.exportPackage({ user: owner, projectIds: [source.id] })).stream,
		);
		await Container.get(AgentRepository).delete(agent.id);
		await service.importPackageSelection(
			importPackageRequest({ user: owner, packageBuffer, workflowConflictPolicy: 'new-version' }),
			{ selectedProjectId: source.id, selectedWorkflowIds: [workflow.id] },
		);
		expect(await Container.get(AgentRepository).count()).toBe(0);
		await Container.get(ProjectRepository).delete(source.id);
		const result = await service.importPackage(
			importPackageRequest({ user: owner, packageBuffer }),
		);
		expect(result.projects[0]).toMatchObject({ localId: source.id, status: 'created' });
		expect(result.agents[0]).toMatchObject({
			localId: agent.id,
			projectId: source.id,
			status: 'created',
		});
	});

	it.each<WorkflowPublishingPolicy>([
		'preserve-published-state',
		'match-source',
		'publish-all',
		'unpublish-all',
	])(
		'applies %s to new agents through the publication lifecycle',
		async (agentPublishingPolicy) => {
			const agent = await completeAgent();
			await Container.get(AgentPublishService).publishAgent(agent.id, source.id, owner, {
				by: 'user',
				trigger: 'explicit',
			});
			const packageBuffer = await exportAgents([agent.id]);
			const result = await importAgents(packageBuffer, {
				agentIdPolicy: 'new',
				agentPublishingPolicy,
			});
			const summary = result.agents[0];
			const publishes =
				agentPublishingPolicy === 'match-source' || agentPublishingPolicy === 'publish-all';
			expect(summary.publishing.state).toBe(publishes ? 'published' : 'unchanged');
			expect(Boolean(summary.activeVersionId)).toBe(publishes);
			const snapshots = await Container.get(AgentTaskSnapshotRepository).findByVersionId(
				summary.activeVersionId ?? 'unpublished',
			);
			expect(snapshots).toHaveLength(publishes ? 1 : 0);
			if (publishes)
				expect(snapshots[0]).toMatchObject({
					versionId: summary.activeVersionId,
					objective: 'Write the report',
					timezone: 'Europe/Vienna',
				});
		},
	);

	it('keeps a published target running its snapshot when importing a draft, and republishes source publications', async () => {
		const agent = await completeAgent();
		const published = (
			await Container.get(AgentPublishService).publishAgent(agent.id, source.id, owner, {
				by: 'user',
				trigger: 'explicit',
			})
		).agent;
		const firstPackage = await exportAgents([agent.id]);
		const initial = await importAgents(firstPackage, {
			agentIdPolicy: 'new',
			agentPublishingPolicy: 'match-source',
		});
		const draft = await Container.get(AgentRepository).findOneByOrFail({ id: agent.id });
		draft.schema = config({ ...draft.schema!, instructions: 'New draft' });
		draft.versionId = randomUUID();
		await Container.get(AgentRepository).save(draft);
		const draftPackage = await exportAgents([agent.id]);
		const draftResult = await importAgents(draftPackage, { agentIdPolicy: 'new' });
		expect(draftResult.agents[0].activeVersionId).toBe(initial.agents[0].activeVersionId);
		expect(
			(await Container.get(AgentRepository).findOneByOrFail({ id: draftResult.agents[0].localId }))
				.schema?.instructions,
		).toBe('New draft');
		await Container.get(AgentPublishService).publishAgent(agent.id, source.id, owner, {
			by: 'user',
			trigger: 'explicit',
		});
		const nextPackage = await exportAgents([agent.id]);
		const updated = await importAgents(nextPackage, { agentIdPolicy: 'new' });
		expect(updated.agents[0].publishing.state).toBe('published');
		expect(updated.agents[0].activeVersionId).not.toBe(initial.agents[0].activeVersionId);
		expect(updated.agents[0].activeVersionId).not.toBe(published.activeVersionId);
		const unpublished = await importAgents(nextPackage, {
			agentIdPolicy: 'new',
			agentPublishingPolicy: 'unpublish-all',
		});
		expect(unpublished.agents[0]).toMatchObject({
			activeVersionId: null,
			publishing: { state: 'unpublished' },
		});
	});

	it('reports publication failures after importing the draft', async () => {
		const agent = await createAgent();
		const packageBuffer = await exportAgents([agent.id]);
		vi.spyOn(
			Container.get(AgentValidationService),
			'validateAgentEntityConfiguration',
		).mockResolvedValue({ status: 'invalid', issues: [] });
		const result = await importAgents(packageBuffer, {
			agentIdPolicy: 'new',
			agentPublishingPolicy: 'publish-all',
		});
		expect(result.agents[0]).toMatchObject({
			status: 'created',
			activeVersionId: null,
			publishing: { state: 'failed', error: expect.any(String) },
		});
		expect(await Container.get(AgentRepository).countBy({ projectId: target.id })).toBe(1);
	});

	it.each(['skill.json', 'tool.json', 'task.json'])(
		'rejects a missing %s before any content is written',
		async (suffix) => {
			const agent = await completeAgent();
			const packageBuffer = await rewritePackage(await exportAgents([agent.id]), (entry) =>
				entry.name.endsWith(`/${suffix}`) ? undefined : entry.content,
			);
			await expect(importAgents(packageBuffer, { agentIdPolicy: 'new' })).rejects.toThrow(
				'missing agent file',
			);
			expect(await Container.get(AgentRepository).countBy({ projectId: target.id })).toBe(0);
		},
	);

	it('rejects conflicts, inaccessible dependencies and missing API-key scopes before writes', async () => {
		const hidden = await createAgent({}, target);
		const agent = await createAgent({
			schema: config({ subAgents: { agents: [{ agentId: hidden.id }] } }),
		});
		const packageBuffer = await exportAgents([agent.id], {
			missingAgentDependencyPolicy: 'reference-only',
		});
		await expect(importAgents(packageBuffer)).rejects.toMatchObject({
			meta: expect.objectContaining({
				issues: expect.arrayContaining([expect.objectContaining({ type: 'agent-id-conflict' })]),
			}),
		});
		await expect(
			importAgents(packageBuffer, { agentIdPolicy: 'new', apiKeyScopes: ['workflow:import'] }),
		).rejects.toThrow('Forbidden');
		const member = await createMember();
		await linkUserToProject(member, source, 'project:editor');
		await expect(
			importAgents(packageBuffer, {
				user: member,
				projectId: source.id,
				agentConflictPolicy: 'fail',
			}),
		).rejects.toThrow('Import blocked');
		await expect(
			importAgents(packageBuffer, { user: member, projectId: source.id }),
		).rejects.toThrow('Import blocked');
		expect(await Container.get(AgentRepository).count()).toBe(2);
	});

	it('rejects task ID collisions without removing the existing task', async () => {
		const first = await completeAgent();
		const second = await createAgent();
		const packageBuffer = await exportAgents([first.id]);
		const task = (await Container.get(AgentTaskRepository).findByAgentId(first.id))[0];
		await Container.get(AgentTaskRepository).update(task.id, { agentId: second.id });
		await Container.get(AgentRepository).delete(first.id);
		await expect(importAgents(packageBuffer)).rejects.toThrow('Import blocked');
		expect(
			(await Container.get(AgentTaskRepository).findOneByOrFail({ id: task.id })).agentId,
		).toBe(second.id);
		expect(await Container.get(AgentRepository).countBy({ projectId: target.id })).toBe(0);
	});

	it('keeps managed credentials, creates placeholders, and blocks their publication', async () => {
		const credential = await saveCredential(
			{ name: 'Model', type: 'openAiApi', data: { apiKey: 'source-value' } },
			{ project: source, role: 'credential:owner' },
		);
		const agent = await createAgent({
			schema: config({
				credential: credential.id,
				subAgents: {
					modelsByDifficulty: {
						low: { model: 'openai/gpt-4.1-mini', credential: MANAGED_CREDENTIAL_TOKEN },
					},
				},
			}),
		});
		const packageBuffer = await exportAgents([agent.id]);
		await Container.get(CredentialsRepository).delete(credential.id);
		const result = await importAgents(packageBuffer, {
			agentIdPolicy: 'new',
			credentialMissingMode: 'create-stub',
			agentPublishingPolicy: 'publish-all',
		});
		expect(result.credentials.stubbed).toEqual([credential.id]);
		expect(result.agents[0].publishing).toEqual({
			state: 'blocked',
			blockedReason: 'stub-credential',
		});
		const imported = await Container.get(AgentRepository).findOneByOrFail({
			id: result.agents[0].localId,
		});
		expect(imported.schema?.credential).toBe(result.bindings.credentials[credential.id]);
		expect(imported.schema?.subAgents?.modelsByDifficulty?.low?.credential).toBe(
			MANAGED_CREDENTIAL_TOKEN,
		);
	});

	it('attributes unresolved ID-only credentials to agents even if the manifest omits them', async () => {
		const agent = await createAgent({ schema: config({ credential: 'unavailable-credential' }) });
		const packageBuffer = await rewritePackage(await exportAgents([agent.id]), (entry) => {
			if (entry.name !== 'manifest.json') return entry.content;
			const manifest = JSON.parse(entry.content.toString());
			delete manifest.requirements;
			return Buffer.from(JSON.stringify(manifest));
		});
		await expect(importAgents(packageBuffer, { agentIdPolicy: 'new' })).rejects.toMatchObject({
			meta: expect.objectContaining({
				issues: [
					expect.objectContaining({ type: 'credential-unresolved', usedByAgents: [agent.id] }),
				],
			}),
		});
		expect(await Container.get(AgentRepository).countBy({ projectId: target.id })).toBe(0);
	});

	it('enforces missing node policies for disabled node tools and blocks publication', async () => {
		const agent = await createAgent({
			schema: config({
				tools: [
					{
						type: 'node',
						name: 'Unknown',
						enabled: false,
						node: { nodeType: 'unavailable.node', nodeTypeVersion: 1, nodeParameters: {} },
					},
				],
			}),
		});
		const packageBuffer = await exportAgents([agent.id]);
		await expect(importAgents(packageBuffer, { agentIdPolicy: 'new' })).rejects.toThrow(
			'Import blocked',
		);
		const result = await importAgents(packageBuffer, {
			agentIdPolicy: 'new',
			missingNodeTypeMode: 'import-anyway',
			agentPublishingPolicy: 'publish-all',
		});
		expect(result.agents[0].publishing).toEqual({
			state: 'blocked',
			blockedReason: 'missing-node-type',
		});
	});

	it('rejects agent content when the module is disabled and still imports workflows', async () => {
		const agent = await createAgent();
		const packageBuffer = await exportAgents([agent.id]);
		vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
		await expect(importAgents(packageBuffer, { agentIdPolicy: 'new' })).rejects.toThrow(
			'agents module is disabled',
		);
		const workflow = await createWorkflow({}, source);
		const workflowPackage = await streamToBuffer(
			(await service.exportPackage({ user: owner, workflowIds: [workflow.id] })).stream,
		);
		const result = await importAgents(workflowPackage);
		expect(result.agents).toEqual([]);
		expect(await Container.get(WorkflowRepository).count()).toBe(2);
	});
});
