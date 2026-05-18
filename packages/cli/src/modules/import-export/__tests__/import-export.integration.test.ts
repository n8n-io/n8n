import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Readable } from 'node:stream';
import { Parser, type ReadEntry } from 'tar';

import { createMember, createOwner } from '@test-integration/db/users';

import { ImportExportService } from '../import-export.service';
import { FORMAT_VERSION } from '../spec/constants';
import type { PackageManifest } from '../spec/manifest.types';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

interface UnpackedEntry {
	name: string;
	type: string;
	content: Buffer;
}

async function unpackTar(buffer: Buffer): Promise<UnpackedEntry[]> {
	const entries: UnpackedEntry[] = [];
	return await new Promise((resolve, reject) => {
		const parser = new Parser();
		parser.on('entry', (entry: ReadEntry) => {
			const chunks: Buffer[] = [];
			entry.on('data', (c: Buffer) => chunks.push(c));
			entry.on('end', () => {
				entries.push({
					name: entry.path,
					type: entry.type,
					content: Buffer.concat(chunks),
				});
			});
			entry.resume();
		});
		parser.on('error', reject);
		parser.on('end', () => resolve(entries));
		parser.end(buffer);
	});
}

beforeAll(async () => {
	await testModules.loadModules(['import-export']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'Project']);
});

describe('workflow package export', () => {
	let service: ImportExportService;

	beforeAll(() => {
		service = Container.get(ImportExportService);
	});

	it('exports a single workflow as a tar bundle with manifest first', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);

		const workflow = await createWorkflow(
			{
				name: 'My Workflow',
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			},
			project,
		);

		const stream = await service.exportWorkflows({ user: owner, workflowIds: [workflow.id] });
		const buffer = await streamToBuffer(stream);
		const entries = await unpackTar(buffer);

		expect(entries[0].name).toBe('manifest.json');
		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.packageFormatVersion).toBe(FORMAT_VERSION);
		expect(manifest.exportedAt).toEqual(expect.any(String));
		expect(manifest.sourceN8nVersion).toEqual(expect.any(String));
		expect(manifest.sourceId).toEqual(expect.any(String));
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(workflow.id);
		expect(manifest.workflows![0].name).toBe('My Workflow');

		const workflowFile = entries.find(
			(e) => e.name === `${manifest.workflows![0].target}/workflow.json`,
		);
		expect(workflowFile).toBeDefined();
		const serialized = JSON.parse(workflowFile!.content.toString());
		expect(serialized.id).toBe(workflow.id);
		expect(serialized.name).toBe('My Workflow');
		expect(serialized.nodes).toHaveLength(1);
		expect(serialized.nodes[0].id).toBe('n1');
	});

	it('exports multiple workflows under distinct slugged targets', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);

		const wfA = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);
		const wfB = await createWorkflow({ name: 'Beta', nodes: [], connections: {} }, project);

		const stream = await service.exportWorkflows({
			user: owner,
			workflowIds: [wfA.id, wfB.id],
		});
		const entries = await unpackTar(await streamToBuffer(stream));

		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.workflows).toHaveLength(2);
		const ids = manifest.workflows!.map((w) => w.id).sort();
		expect(ids).toEqual([wfA.id, wfB.id].sort());

		const targets = manifest.workflows!.map((w) => w.target);
		expect(new Set(targets).size).toBe(2);

		for (const entry of manifest.workflows!) {
			const file = entries.find((e) => e.name === `${entry.target}/workflow.json`);
			expect(file).toBeDefined();
		}
	});

	it('fails the entire export and names every missing workflow id', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const wf = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);

		await expect(
			service.exportWorkflows({
				user: owner,
				workflowIds: [wf.id, 'missing-1', 'missing-2'],
			}),
		).rejects.toThrow(/missing-1.*missing-2/);
	});

	it('rejects export of workflows the caller has no access to with "not found"', async () => {
		const owner = await createOwner();
		const ownerProject = await createTeamProject('Owner Project', owner);
		const ownerWorkflow = await createWorkflow(
			{ name: 'Owners Workflow', nodes: [], connections: {} },
			ownerProject,
		);

		const member = await createMember();

		await expect(
			service.exportWorkflows({
				user: member,
				workflowIds: [ownerWorkflow.id],
			}),
		).rejects.toThrow(ownerWorkflow.id);
	});

	it('lets a member export workflows in their personal project', async () => {
		const member = await createMember();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		const wf = await createWorkflow(
			{ name: 'Member Workflow', nodes: [], connections: {} },
			personalProject,
		);

		const stream = await service.exportWorkflows({ user: member, workflowIds: [wf.id] });
		const entries = await unpackTar(await streamToBuffer(stream));

		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(wf.id);
	});

	it('lets a project editor export workflows from the team project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Editor Project', owner);
		const editor = await createMember();
		await linkUserToProject(editor, project, 'project:editor');
		const wf = await createWorkflow(
			{ name: 'Project Workflow', nodes: [], connections: {} },
			project,
		);

		const stream = await service.exportWorkflows({ user: editor, workflowIds: [wf.id] });
		const entries = await unpackTar(await streamToBuffer(stream));

		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(wf.id);
	});

	it('lets a project viewer export workflows from the team project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Viewer Project', owner);
		const viewer = await createMember();
		await linkUserToProject(viewer, project, 'project:viewer');
		const wf = await createWorkflow(
			{ name: 'Viewable Workflow', nodes: [], connections: {} },
			project,
		);

		const stream = await service.exportWorkflows({ user: viewer, workflowIds: [wf.id] });
		const entries = await unpackTar(await streamToBuffer(stream));

		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(wf.id);
	});

	it('lets a user export a workflow that has been shared with them directly', async () => {
		const owner = await createOwner();
		const ownerProject = await createTeamProject('Source Project', owner);
		const wf = await createWorkflow(
			{ name: 'Shared Workflow', nodes: [], connections: {} },
			ownerProject,
		);

		const sharee = await createMember();
		await shareWorkflowWithUsers(wf, [sharee]);

		const stream = await service.exportWorkflows({ user: sharee, workflowIds: [wf.id] });
		const entries = await unpackTar(await streamToBuffer(stream));

		const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(wf.id);
	});
});
