import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	shareWorkflowWithProjects,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { FORMAT_VERSION } from '../spec/constants';
import { readExport } from './utils/tar-support';
import { buildWorkflowReferencingCredential } from './utils/test-builders';

let service: N8nPackagesService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	service = Container.get(N8nPackagesService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'ProjectRelation',
		'Project',
	]);
});

async function exportProjects(user: User, projectIds: string[]) {
	return await readExport(await service.exportPackage({ user, projectIds }));
}

async function exportProject(user: User, projectId: string) {
	return await exportProjects(user, [projectId]);
}

describe('project package export', () => {
	it('emits a tar with manifest.json first and project.json for an empty team project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Empty Project', owner);

		const { manifest, entries } = await exportProject(owner, project.id);

		expect(entries[0].name).toBe('manifest.json');
		expect(manifest).toMatchObject({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: expect.any(String),
			sourceN8nVersion: expect.any(String),
			sourceId: expect.any(String),
		});
		expect(manifest.projects).toEqual([
			{ id: project.id, name: 'Empty Project', target: expect.any(String) },
		]);
		expect(manifest.workflows).toBeUndefined();

		const projectFile = entries.find(
			(e) => e.name === `${manifest.projects![0].target}/project.json`,
		);
		expect(projectFile).toBeDefined();
		const serialized = JSON.parse(projectFile!.content.toString());
		expect(serialized).toEqual({
			id: project.id,
			name: 'Empty Project',
		});
	});

	it('emits n8n-package-exported with the exported projectIds', async () => {
		const owner = await createOwner();
		const firstProject = await createTeamProject('Alpha Project', owner);
		const secondProject = await createTeamProject('Beta Project', owner);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		try {
			await service.exportPackage({
				user: owner,
				projectIds: [firstProject.id, secondProject.id],
			});

			const exportedEvents = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-exported');
			expect(exportedEvents).toHaveLength(1);

			const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
			expect([...payload.projectIds!].sort()).toEqual([firstProject.id, secondProject.id].sort());
		} finally {
			emitSpy.mockRestore();
		}
	});

	it('exports multiple team projects in a single request', async () => {
		const owner = await createOwner();
		const firstProject = await createTeamProject('Alpha Project', owner);
		const secondProject = await createTeamProject('Beta Project', owner);

		const { manifest, entries } = await exportProjects(owner, [secondProject.id, firstProject.id]);

		expect(manifest.projects).toHaveLength(2);
		expect(manifest.projects).toEqual(
			expect.arrayContaining([
				{ id: firstProject.id, name: 'Alpha Project', target: 'projects/alpha-project' },
				{ id: secondProject.id, name: 'Beta Project', target: 'projects/beta-project' },
			]),
		);

		for (const { id, name, target } of manifest.projects!) {
			const projectFile = entries.find((entry) => entry.name === `${target}/project.json`);
			expect(projectFile).toBeDefined();
			expect(JSON.parse(projectFile!.content.toString())).toEqual({ id, name });
		}
	});

	it('exports the owner personal project', async () => {
		const owner = await createOwner();
		const personalProject = await getPersonalProject(owner);

		const { manifest, entries } = await exportProject(owner, personalProject.id);

		expect(manifest.projects).toEqual([
			{ id: personalProject.id, name: personalProject.name, target: expect.any(String) },
		]);

		const projectFile = entries.find(
			(entry) => entry.name === `${manifest.projects![0].target}/project.json`,
		);
		expect(projectFile).toBeDefined();
		expect(JSON.parse(projectFile!.content.toString())).toEqual({
			id: personalProject.id,
			name: personalProject.name,
		});
	});

	it('allows a project editor to export an empty team project', async () => {
		const owner = await createOwner();
		const editor = await createMember();
		const project = await createTeamProject('Editor Project', owner);
		await linkUserToProject(editor, project, 'project:editor');

		const { manifest } = await exportProject(editor, project.id);

		expect(manifest.projects).toEqual([
			{ id: project.id, name: 'Editor Project', target: expect.any(String) },
		]);
	});

	it('rejects export when the user lacks project access', async () => {
		const owner = await createOwner();
		const outsider = await createMember();
		const project = await createTeamProject('Private Project', owner);

		await expect(exportProject(outsider, project.id)).rejects.toThrow(
			'1 project(s) not found or not accessible. Export aborted.',
		);
	});

	it("rejects exporting another user's personal project", async () => {
		const projectOwner = await createMember();
		const otherUser = await createMember();
		const personalProject = await getPersonalProject(projectOwner);

		await expect(exportProject(otherUser, personalProject.id)).rejects.toThrow(
			'1 project(s) not found or not accessible. Export aborted.',
		);
	});
});

describe('project package export — with folders / workflows', () => {
	it('nests a folder and its workflow inside the project namespace', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const workflow = await createWorkflow({ name: 'triage', parentFolder: folder }, project);

		const { manifest, entries } = await exportProject(owner, project.id);

		const projectEntry = manifest.projects!.find((p) => p.id === project.id)!;
		expect(entries.find((e) => e.name === `${projectEntry.target}/project.json`)).toBeDefined();

		const folderEntry = manifest.folders!.find((f) => f.id === folder.id)!;
		expect(folderEntry.target).toMatch(new RegExp(`^${projectEntry.target}/folders/[^/]+$`));

		const workflowEntry = manifest.workflows!.find((w) => w.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(new RegExp(`^${folderEntry.target}/workflows/[^/]+$`));
		expect(entries.find((e) => e.name === `${workflowEntry.target}/workflow.json`)).toBeDefined();
	});

	it('preserves nested folders and exports an empty folder as a shell', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const emptyFolder = await createFolder(project, { name: 'to_production' });
		const inProgress = await createFolder(project, { name: 'in_progress' });
		const nested = await createFolder(project, { name: 'nested', parentFolder: inProgress });
		const workflow = await createWorkflow({ name: 'playground', parentFolder: nested }, project);

		const { manifest, entries } = await exportProject(owner, project.id);

		const projectEntry = manifest.projects!.find((p) => p.id === project.id)!;
		const inProgressEntry = manifest.folders!.find((f) => f.id === inProgress.id)!;
		const nestedEntry = manifest.folders!.find((f) => f.id === nested.id)!;

		expect(inProgressEntry.target).toMatch(new RegExp(`^${projectEntry.target}/folders/[^/]+$`));
		expect(nestedEntry.target).toMatch(new RegExp(`^${inProgressEntry.target}/[^/]+$`));

		const emptyEntry = manifest.folders!.find((f) => f.id === emptyFolder.id)!;
		expect(emptyEntry.target).toMatch(new RegExp(`^${projectEntry.target}/folders/[^/]+$`));
		expect(entries.some((e) => e.name.startsWith(`${emptyEntry.target}/workflows/`))).toBe(false);

		const workflowEntry = manifest.workflows!.find((w) => w.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(new RegExp(`^${nestedEntry.target}/workflows/[^/]+$`));
	});

	it('nests a project root workflow under the project workflows/ dir', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const workflow = await createWorkflow({ name: 'standalone' }, project);

		const { manifest, entries } = await exportProject(owner, project.id);

		const projectEntry = manifest.projects!.find((p) => p.id === project.id)!;
		const workflowEntry = manifest.workflows!.find((w) => w.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(new RegExp(`^${projectEntry.target}/workflows/[^/]+$`));
		expect(entries.find((e) => e.name === `${workflowEntry.target}/workflow.json`)).toBeDefined();
		expect(manifest.folders).toBeUndefined();
	});

	it('namespaces a project-owned credential inside the project directory', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const credential = await saveCredential(
			{ name: 'Linear API', type: 'httpHeaderAuth', data: { name: 'X-Auth', value: 'secret' } },
			{ project, role: 'credential:owner' },
		);
		const workflow = await buildWorkflowReferencingCredential({
			name: 'triage',
			project,
			credential,
			parentFolder: folder,
		});

		const { manifest, entries } = await exportProject(owner, project.id);

		const projectEntry = manifest.projects!.find((p) => p.id === project.id)!;
		expect(manifest.credentials).toHaveLength(1);
		const credentialEntry = manifest.credentials![0];
		expect(credentialEntry.id).toBe(credential.id);
		expect(credentialEntry.target).toMatch(
			new RegExp(`^${projectEntry.target}/credentials/[^/]+$`),
		);
		expect(
			entries.find((e) => e.name === `${credentialEntry.target}/credential.json`),
		).toBeDefined();
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: credential.id,
					name: credential.name,
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});
	});

	it('keeps a credential owned by a non-exported project at the package top level', async () => {
		const owner = await createOwner();
		const exportedProject = await createTeamProject('team-ligo', owner);
		const otherProject = await createTeamProject('team-stilton', owner);
		const credential = await saveCredential(
			{ name: 'Shared OpenAI', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
			{ project: otherProject, role: 'credential:owner' },
		);
		await buildWorkflowReferencingCredential({
			name: 'uses-external',
			project: exportedProject,
			credential,
		});

		const { manifest } = await exportProject(owner, exportedProject.id);

		expect(manifest.credentials).toHaveLength(1);
		// Owned elsewhere → top-level credentials/, not inside the project namespace.
		expect(manifest.credentials![0].target).toMatch(/^credentials\/[^/]+$/);
	});

	it('writes a credential shared across two exported projects once, under its owner', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('team-ligo', owner);
		const projectB = await createTeamProject('team-stilton', owner);
		const credential = await saveCredential(
			{ name: 'Linear API', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
			{ project: projectA, role: 'credential:owner' },
		);
		const workflowA = await buildWorkflowReferencingCredential({
			name: 'in-a',
			project: projectA,
			credential,
		});
		const workflowB = await buildWorkflowReferencingCredential({
			name: 'in-b',
			project: projectB,
			credential,
		});

		const { manifest } = await exportProjects(owner, [projectA.id, projectB.id]);

		const projectAEntry = manifest.projects!.find((p) => p.id === projectA.id)!;
		expect(manifest.credentials).toHaveLength(1);
		expect(manifest.credentials![0].id).toBe(credential.id);
		expect(manifest.credentials![0].target).toMatch(
			new RegExp(`^${projectAEntry.target}/credentials/[^/]+$`),
		);
		const usedByWorkflows = (manifest.requirements?.credentials ?? []).flatMap(
			(c) => c.usedByWorkflows,
		);
		expect(usedByWorkflows.sort()).toEqual([workflowA.id, workflowB.id].sort());
	});

	it('exports a root workflow shared across two projects only under its owner', async () => {
		const owner = await createOwner();
		const ownerProject = await createTeamProject('team-ligo', owner);
		const otherProject = await createTeamProject('team-stilton', owner);
		const workflow = await createWorkflow({ name: 'shared-root' }, ownerProject);
		await shareWorkflowWithProjects(workflow, [{ project: otherProject, role: 'workflow:editor' }]);

		const { manifest } = await exportProjects(owner, [ownerProject.id, otherProject.id]);

		const ownerProjectEntry = manifest.projects!.find((p) => p.id === ownerProject.id)!;
		const matching = manifest.workflows!.filter((w) => w.id === workflow.id);
		expect(matching).toHaveLength(1);
		expect(matching[0].target.startsWith(`${ownerProjectEntry.target}/`)).toBe(true);
	});

	it('allocates same-named credentials independently per namespace', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const otherProject = await createTeamProject('team-stilton', owner);
		const ownedCred = await saveCredential(
			{ name: 'Shared API', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
			{ project, role: 'credential:owner' },
		);
		const externalCred = await saveCredential(
			{ name: 'Shared API', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
			{ project: otherProject, role: 'credential:owner' },
		);
		await buildWorkflowReferencingCredential({
			name: 'uses-owned',
			project,
			credential: ownedCred,
		});
		await buildWorkflowReferencingCredential({
			name: 'uses-external',
			project,
			credential: externalCred,
		});

		const { manifest } = await exportProject(owner, project.id);

		const projectEntry = manifest.projects!.find((p) => p.id === project.id)!;
		const ownedEntry = manifest.credentials!.find((c) => c.id === ownedCred.id)!;
		const externalEntry = manifest.credentials!.find((c) => c.id === externalCred.id)!;
		// Same name, different base dirs → each keeps the bare slug, no cross-namespace suffixing.
		expect(ownedEntry.target).toMatch(new RegExp(`^${projectEntry.target}/credentials/[^/]+$`));
		expect(externalEntry.target).toMatch(/^credentials\/[^/]+$/);
		expect(ownedEntry.target).not.toBe(externalEntry.target);
	});

	it('exports two projects each with their own nested contents', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('team-ligo', owner);
		const folderA = await createFolder(projectA, { name: 'in_progress' });
		const workflowA = await createWorkflow({ name: 'triage', parentFolder: folderA }, projectA);

		const projectB = await createTeamProject('team-stilton', owner);
		const folderB = await createFolder(projectB, { name: 'backlog' });
		const workflowB = await createWorkflow({ name: 'sync', parentFolder: folderB }, projectB);

		const { manifest } = await exportProjects(owner, [projectA.id, projectB.id]);

		expect(manifest.projects).toHaveLength(2);
		const projectAEntry = manifest.projects!.find((p) => p.id === projectA.id)!;
		const projectBEntry = manifest.projects!.find((p) => p.id === projectB.id)!;

		const workflowAEntry = manifest.workflows!.find((w) => w.id === workflowA.id)!;
		const workflowBEntry = manifest.workflows!.find((w) => w.id === workflowB.id)!;
		expect(workflowAEntry.target.startsWith(`${projectAEntry.target}/`)).toBe(true);
		expect(workflowBEntry.target.startsWith(`${projectBEntry.target}/`)).toBe(true);
		expect(projectAEntry.target).not.toBe(projectBEntry.target);
	});

	// Telemetry
	it('counts project folders, workflows and credentials in the export telemetry', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const credential = await saveCredential(
			{ name: 'Linear API', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
			{ project, role: 'credential:owner' },
		);
		await buildWorkflowReferencingCredential({
			name: 'triage',
			project,
			credential,
			parentFolder: folder,
		});
		await createWorkflow({ name: 'standalone' }, project);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		try {
			await service.exportPackage({ user: owner, projectIds: [project.id] });

			const events = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-exported');
			expect(events).toHaveLength(1);
			const payload = events[0][1] as RelayEventMap['n8n-package-exported'];
			expect(payload.counts.workflows).toBe(2);
			expect(payload.counts.folders).toBe(1);
			expect(payload.counts.credentials).toBe(1);
		} finally {
			emitSpy.mockRestore();
		}
	});

	// Abort propagates through the project → folder → workflow composition
	it('aborts when the project contains a workflow the caller cannot export', async () => {
		const member = await createMember();
		const memberProject = await createTeamProject('team-ligo', member);
		const folder = await createFolder(memberProject, { name: 'in_progress' });

		const owner = await createOwner();
		const ownerProject = await createTeamProject('owner-project', owner);
		// The workflow sits in the member's folder but is shared only with the owner's
		// project, so the member can project:export their own project yet cannot
		// workflow:export this workflow — the composition must abort, not ship partial.
		await createWorkflow({ name: 'secret', parentFolder: folder }, ownerProject);

		await expect(
			service.exportPackage({ user: member, projectIds: [memberProject.id] }),
		).rejects.toThrow(/workflow\(s\) not found or not accessible/);
	});
});
