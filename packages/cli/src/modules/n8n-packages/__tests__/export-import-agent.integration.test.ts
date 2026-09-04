import type { AgentJsonConfig } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentFileRepository } from '@/modules/agents/repositories/agent-file.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { PackageExportBlockedError } from '../entities/package-export.errors';
import { PackageExportConfig } from '../n8n-packages.config';
import { N8nPackagesService } from '../n8n-packages.service';
import type { PackageManifest } from '../spec/manifest.schema';
import { importPackageRequest } from './fixtures/import-request';
import { readExport, streamToBuffer, unpackTar, type UnpackedEntry } from './utils/tar-support';
import type { SerializedAgent } from '../spec/serialized/agent.schema';

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'agents']);
	await testDb.init();
	await initNodeTypes();
	new LicenseMocker().mockLicenseState(Container.get(LicenseState));
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Agent tables are module entities the truncate util does not know about.
	await Container.get(AgentFileRepository).delete({});
	await Container.get(AgentTaskRepository).delete({});
	await Container.get(AgentRepository).delete({});
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
});

const SKILL_ID = 'skill_refund01';
const TOOL_ID = 'lookup_order';
const TASK_ID = 'task_digest01';
const SOURCE_CREDENTIAL_ID = 'srcCred12345';
const KNOWLEDGE_CONTENT = 'Refunds close after 30 days.';

function agentConfig(workflowId: string, workflowName: string): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'openai/gpt-4.1',
		credential: SOURCE_CREDENTIAL_ID,
		instructions: 'Help customers with refunds.',
		tools: [
			{ type: 'workflow', workflowId, workflow: workflowName },
			{ type: 'custom', id: TOOL_ID },
		],
		skills: [{ type: 'skill', id: SKILL_ID }],
		tasks: [{ type: 'task', id: TASK_ID, enabled: true }],
	};
}

async function createSourceAgent(projectId: string, workflowId: string, workflowName: string) {
	const agentsService = Container.get(AgentsService);
	const agent = await agentsService.create(projectId, 'Support Agent', {
		availableInMCP: true,
		schema: agentConfig(workflowId, workflowName),
		skills: {
			[SKILL_ID]: {
				name: 'Refund policy',
				description: 'How refunds work',
				instructions: 'Follow the refund playbook.',
			},
		},
		tools: {
			[TOOL_ID]: {
				code: 'return { found: true };',
				descriptor: {
					name: TOOL_ID,
					description: 'Looks up an order',
					systemInstruction: null,
					inputSchema: null,
					outputSchema: null,
					hasSuspend: false,
					hasResume: false,
					hasToMessage: false,
					requireApproval: false,
					providerOptions: null,
				},
			},
		},
		tasks: [
			{
				id: TASK_ID,
				name: 'Daily digest',
				objective: 'Summarise open refund requests.',
				cronExpression: '0 9 * * *',
				timezone: null,
			},
		],
	});

	await Container.get(AgentKnowledgeService).importFile(
		agent.id,
		{ fileName: 'refund-policy.md', mimeType: 'text/markdown', fileSizeBytes: 28 },
		Buffer.from(KNOWLEDGE_CONTENT),
	);

	return agent;
}

function manifestOf(entries: UnpackedEntry[]): PackageManifest {
	const file = entries.find((entry) => entry.name === 'manifest.json');
	if (!file) throw new Error('missing manifest.json');
	return jsonParse<PackageManifest>(file.content.toString());
}

function agentJson(entries: UnpackedEntry[], target: string): SerializedAgent {
	const file = entries.find((entry) => entry.name === `${target}/agent.json`);
	if (!file) throw new Error(`missing ${target}/agent.json`);
	return jsonParse<SerializedAgent>(file.content.toString());
}

describe('agent package export and import', () => {
	let service: N8nPackagesService;
	let owner: User;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	beforeEach(async () => {
		owner = await createOwner();
	});

	it('exports an agent with its config, bodies, knowledge, and workflow tool', async () => {
		const project = await createTeamProject('Source', owner);
		const workflow = await createWorkflow({ name: 'Order Lookup' }, project);
		const agent = await createSourceAgent(project.id, workflow.id, workflow.name);

		const { stream, counts } = await service.exportPackage({
			user: owner,
			agentIds: [agent.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(counts.agents).toBe(1);
		expect(manifest.agents).toEqual([
			{ id: agent.id, name: 'Support Agent', target: 'agents/support-agent' },
		]);
		expect(manifest.workflows).toEqual([
			expect.objectContaining({ id: workflow.id, target: 'workflows/order-lookup' }),
		]);

		const serialized = agentJson(entries, 'agents/support-agent');
		expect(serialized.id).toBe(agent.id);
		expect(serialized.config?.credential).toBe(SOURCE_CREDENTIAL_ID);
		expect(serialized.skills[SKILL_ID].name).toBe('Refund policy');
		expect(serialized.tools[TOOL_ID].code).toBe('return { found: true };');
		expect(serialized.tasks).toEqual([
			expect.objectContaining({ id: TASK_ID, cronExpression: '0 9 * * *' }),
		]);
		expect(serialized.availableInMCP).toBe(true);
		expect(serialized.files).toEqual([
			{
				fileName: 'refund-policy.md',
				mimeType: 'text/markdown',
				fileSizeBytes: 28,
				target: 'agents/support-agent/files/file-1',
			},
		]);

		const blob = entries.find((entry) => entry.name === 'agents/support-agent/files/file-1');
		expect(blob?.content.toString()).toBe(KNOWLEDGE_CONTENT);
	});

	it('round-trips an agent: workflow tool rebinds, credential blanks, bodies and knowledge land', async () => {
		const source = await createTeamProject('Source', owner);
		const destination = await createTeamProject('Destination', owner);
		const workflow = await createWorkflow({ name: 'Order Lookup' }, source);
		const agent = await createSourceAgent(source.id, workflow.id, workflow.name);

		const { stream } = await service.exportPackage({ user: owner, agentIds: [agent.id] });
		const packageBuffer = await streamToBuffer(stream);

		const agentsService = Container.get(AgentsService);
		await agentsService.delete(agent.id, source.id);

		const result = await service.importPackage(
			importPackageRequest({ user: owner, projectId: destination.id, packageBuffer }),
		);

		expect(result.agents).toEqual([
			{
				sourceAgentId: agent.id,
				localId: agent.id,
				name: 'Support Agent',
				status: 'created',
				files: 1,
			},
		]);

		const imported = await agentsService.findById(agent.id, destination.id);
		expect(imported).not.toBeNull();
		expect(imported!.availableInMCP).toBe(true);
		expect(imported!.skills[SKILL_ID].instructions).toBe('Follow the refund playbook.');
		expect(imported!.tools[TOOL_ID].descriptor.description).toBe('Looks up an order');

		// The workflow imported under a fresh id (workflowIdPolicy=new); the agent's tool follows it.
		const importedWorkflowId = result.workflows[0].localId;
		expect(importedWorkflowId).not.toBe(workflow.id);
		const workflowTool = imported!.schema?.tools?.find((tool) => tool.type === 'workflow');
		expect(workflowTool).toEqual(expect.objectContaining({ workflowId: importedWorkflowId }));

		// No credential travelled and none was bound, so the reference blanks.
		expect(imported!.schema?.credential).toBe('');

		const tasks = await agentsService.getTasks(agent.id);
		expect(tasks).toEqual([expect.objectContaining({ id: TASK_ID, name: 'Daily digest' })]);

		const files = await Container.get(AgentKnowledgeService).getFilesWithContent(agent.id);
		expect(files).toHaveLength(1);
		expect(files[0].file.fileName).toBe('refund-policy.md');
		expect(files[0].content.toString()).toBe(KNOWLEDGE_CONTENT);
	});

	it('blocks the import when the agent id is already taken in the target project', async () => {
		const source = await createTeamProject('Source', owner);
		const workflow = await createWorkflow({ name: 'Order Lookup' }, source);
		const agent = await createSourceAgent(source.id, workflow.id, workflow.name);

		const { stream } = await service.exportPackage({ user: owner, agentIds: [agent.id] });
		const packageBuffer = await streamToBuffer(stream);

		await expect(
			service.importPackage(
				importPackageRequest({ user: owner, projectId: source.id, packageBuffer }),
			),
		).rejects.toThrow('Import blocked');
	});

	it('fails the export when the agent knowledge exceeds the cap', async () => {
		const project = await createTeamProject('Source', owner);
		const workflow = await createWorkflow({ name: 'Order Lookup' }, project);
		const agent = await createSourceAgent(project.id, workflow.id, workflow.name);

		const exportConfig = Container.get(PackageExportConfig);
		const originalCap = exportConfig.maxAgentKnowledgeBytes;
		exportConfig.maxAgentKnowledgeBytes = 4;
		try {
			await expect(service.exportPackage({ user: owner, agentIds: [agent.id] })).rejects.toThrow(
				PackageExportBlockedError,
			);
		} finally {
			exportConfig.maxAgentKnowledgeBytes = originalCap;
		}
	});

	it('carries agents inside a project package and imports them with the project', async () => {
		const source = await createTeamProject('Acme Ops', owner);
		const workflow = await createWorkflow({ name: 'Order Lookup' }, source);
		const agent = await createSourceAgent(source.id, workflow.id, workflow.name);

		const { stream } = await service.exportPackage({ user: owner, projectIds: [source.id] });
		const packageBuffer = await streamToBuffer(stream);
		const manifest = manifestOf(await unpackTar(packageBuffer));

		expect(manifest.agents).toEqual([
			{ id: agent.id, name: 'Support Agent', target: 'projects/acme-ops/agents/support-agent' },
		]);

		const agentsService = Container.get(AgentsService);
		await agentsService.delete(agent.id, source.id);
		await testDb.truncate(['SharedWorkflow', 'WorkflowHistory', 'WorkflowEntity']);

		const result = await service.importPackage(
			importPackageRequest({ user: owner, packageBuffer }),
		);

		expect(result.agents).toEqual([
			expect.objectContaining({ sourceAgentId: agent.id, status: 'created', files: 1 }),
		]);
		const imported = await agentsService.findById(agent.id, source.id);
		expect(imported).not.toBeNull();
	});
});
