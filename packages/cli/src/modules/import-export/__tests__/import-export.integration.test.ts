import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Readable } from 'node:stream';
import { Parser, type ReadEntry } from 'tar';

import { createMember, createOwner } from '@test-integration/db/users';

import { ImportExportService } from '../import-export.service';
import { FORMAT_VERSION } from '../spec/constants';
import type { PackageManifest } from '../spec/manifest.types';

interface UnpackedEntry {
	name: string;
	type: string;
	content: Buffer;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

async function unpackTar(buffer: Buffer): Promise<UnpackedEntry[]> {
	const entries: UnpackedEntry[] = [];
	return await new Promise((resolve, reject) => {
		const parser = new Parser();
		parser.on('entry', (entry: ReadEntry) => {
			const chunks: Buffer[] = [];
			entry.on('data', (c: Buffer) => chunks.push(c));
			entry.on('end', () => {
				entries.push({ name: entry.path, type: entry.type, content: Buffer.concat(chunks) });
			});
			entry.resume();
		});
		parser.on('error', reject);
		parser.on('end', () => resolve(entries));
		parser.end(buffer);
	});
}

async function readExport(stream: Readable) {
	const entries = await unpackTar(await streamToBuffer(stream));
	const manifest = JSON.parse(entries[0].content.toString()) as PackageManifest;
	return { manifest, entries };
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

	async function exportSingleWorkflow(user: User, workflowId: string) {
		const stream = await service.exportWorkflows({ user, workflowIds: [workflowId] });
		return await readExport(stream);
	}

	describe('package contents', () => {
		it('emits a tar with manifest.json first and a workflow.json per requested workflow', async () => {
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

			const { manifest, entries } = await exportSingleWorkflow(owner, workflow.id);

			expect(entries[0].name).toBe('manifest.json');
			expect(manifest).toMatchObject({
				packageFormatVersion: FORMAT_VERSION,
				exportedAt: expect.any(String),
				sourceN8nVersion: expect.any(String),
				sourceId: expect.any(String),
			});
			expect(manifest.workflows).toEqual([
				{ id: workflow.id, name: 'My Workflow', target: expect.any(String) },
			]);

			const workflowFile = entries.find(
				(e) => e.name === `${manifest.workflows![0].target}/workflow.json`,
			);
			expect(workflowFile).toBeDefined();
			const serialized = JSON.parse(workflowFile!.content.toString());
			expect(serialized.id).toBe(workflow.id);
			expect(serialized.nodes).toHaveLength(1);
		});

		it('writes each workflow under a distinct slugged target', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const wfA = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);
			const wfB = await createWorkflow({ name: 'Beta', nodes: [], connections: {} }, project);

			const stream = await service.exportWorkflows({
				user: owner,
				workflowIds: [wfA.id, wfB.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.workflows).toHaveLength(2);
			expect(manifest.workflows!.map((w) => w.id).sort()).toEqual([wfA.id, wfB.id].sort());
			expect(new Set(manifest.workflows!.map((w) => w.target)).size).toBe(2);

			for (const entry of manifest.workflows!) {
				expect(entries.find((e) => e.name === `${entry.target}/workflow.json`)).toBeDefined();
			}
		});
	});

	describe('authorization', () => {
		it('lists every unexportable id in the error', async () => {
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

		it('denies a caller with no access, naming the workflow as "not found"', async () => {
			// Unauthorized and truly-missing ids surface with the same message so a caller
			// can't probe whether a workflow exists outside their permission scope.
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Owner Project', owner);
			const ownerWorkflow = await createWorkflow(
				{ name: 'Owners Workflow', nodes: [], connections: {} },
				ownerProject,
			);
			const outsider = await createMember();

			await expect(
				service.exportWorkflows({ user: outsider, workflowIds: [ownerWorkflow.id] }),
			).rejects.toThrow(ownerWorkflow.id);
		});

		it('allows a personal-project owner to export their own workflows', async () => {
			const member = await createMember();
			const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				member.id,
			);
			const wf = await createWorkflow(
				{ name: 'Member Workflow', nodes: [], connections: {} },
				personal,
			);

			const { manifest } = await exportSingleWorkflow(member, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a project editor to export team project workflows', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Editor Project', owner);
			const editor = await createMember();
			await linkUserToProject(editor, project, 'project:editor');
			const wf = await createWorkflow({ name: 'Editable', nodes: [], connections: {} }, project);

			const { manifest } = await exportSingleWorkflow(editor, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a project viewer to export team project workflows', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Viewer Project', owner);
			const viewer = await createMember();
			await linkUserToProject(viewer, project, 'project:viewer');
			const wf = await createWorkflow({ name: 'Viewable', nodes: [], connections: {} }, project);

			const { manifest } = await exportSingleWorkflow(viewer, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a direct-share recipient to export the shared workflow', async () => {
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Source Project', owner);
			const wf = await createWorkflow(
				{ name: 'Shared Workflow', nodes: [], connections: {} },
				ownerProject,
			);
			const sharee = await createMember();
			await shareWorkflowWithUsers(wf, [sharee]);

			const { manifest } = await exportSingleWorkflow(sharee, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});
	});
});
