import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';

import { PackageEntityAccessDeniedError } from '../entities/package-export.errors';
import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';
import {
	buildWorkflowCallingSubWorkflow,
	buildWorkflowReferencingCredential,
	buildWorkflowReferencingVariables,
} from './utils/test-builders';

type ExportEntries = Awaited<ReturnType<typeof readExport>>['entries'];

function folderShell(entries: ExportEntries, target: string): Record<string, unknown> {
	const file = entries.find((e) => e.name === `${target}/folder.json`);
	if (!file) throw new Error(`missing ${target}/folder.json`);
	return jsonParse<Record<string, unknown>>(file.content.toString());
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
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
		'Variables',
		'ProjectRelation',
		'Project',
	]);
});

describe('folder package export', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('exports an empty folder as a folder.json shell with a manifest pointer', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.folders).toHaveLength(1);
		expect(manifest.folders![0]).toMatchObject({ id: folder.id, name: 'to_production' });
		const target = manifest.folders![0].target;
		expect(target).toMatch(/^folders\//);

		const folderFile = entries.find((e) => e.name === `${target}/folder.json`);
		expect(folderFile).toBeDefined();
		expect(jsonParse(folderFile!.content.toString())).toEqual({
			id: folder.id,
			name: 'to_production',
			parentFolderId: null,
		});
	});

	it('emits n8n-package-exported with the exported folderIds', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		try {
			await service.exportPackage({ user: owner, workflowIds: [], folderIds: [folder.id] });

			const exportedEvents = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-exported');
			expect(exportedEvents).toHaveLength(1);

			const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
			expect(payload.folderIds).toEqual([folder.id]);
		} finally {
			emitSpy.mockRestore();
		}
	});

	it('aborts the export when the user cannot access the folder', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'to_production' });
		const outsider = await createMember();

		await expect(
			service.exportPackage({ user: outsider, workflowIds: [], folderIds: [folder.id] }),
		).rejects.toThrow(/not found or not accessible/);
	});

	it('exports two sibling empty folders as separate shells', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const toProduction = await createFolder(project, { name: 'to_production' });
		const inProgress = await createFolder(project, { name: 'in_progress' });

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [toProduction.id, inProgress.id],
		});
		const { manifest } = await readExport(stream);

		expect(manifest.folders).toHaveLength(2);
		expect(manifest.folders!.map((f) => f.id).sort()).toEqual(
			[toProduction.id, inProgress.id].sort(),
		);
		for (const entry of manifest.folders!) {
			expect(entry.target).toMatch(/^folders\/[^/]+$/);
		}
	});

	it('blocks folder exports when a static sub-workflow is outside the package', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('Project A', owner);
		const projectB = await createTeamProject('Project B', owner);
		const folder = await createFolder(projectA, { name: 'Folder A' });
		const externalChild = await createWorkflow(
			{ name: 'External Child', nodes: [], connections: {} },
			projectB,
		);
		await buildWorkflowCallingSubWorkflow({
			name: 'Parent',
			project: projectA,
			parentFolder: folder,
			subWorkflowId: externalChild.id,
		});

		await expect(service.exportPackage({ user: owner, folderIds: [folder.id] })).rejects.toThrow(
			'sub-workflow dependency not included in the package',
		);
	});

	it('allows folder exports when an external static sub-workflow is selected as a top-level workflow', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('Project A', owner);
		const projectB = await createTeamProject('Project B', owner);
		const folder = await createFolder(projectA, { name: 'Folder A' });
		const externalChild = await createWorkflow(
			{ name: 'External Child', nodes: [], connections: {} },
			projectB,
		);
		const parent = await buildWorkflowCallingSubWorkflow({
			name: 'Parent',
			project: projectA,
			parentFolder: folder,
			subWorkflowId: externalChild.id,
		});

		const stream = await service.exportPackage({
			user: owner,
			folderIds: [folder.id],
			workflowIds: [externalChild.id],
		});
		const { manifest, entries } = await readExport(stream);

		const childEntry = manifest.workflows!.find(({ id }) => id === externalChild.id);
		expect(childEntry?.target).toBe('workflows/external-child');
		expect(entries.find((e) => e.name === `${childEntry!.target}/workflow.json`)).toBeDefined();
		expect(manifest.requirements?.workflows).toEqual([
			{ id: externalChild.id, name: externalChild.name, usedByWorkflows: [parent.id] },
		]);
	});

	it('preserves nesting through multiple levels when exporting a folder subtree', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const parent = await createFolder(project, { name: 'in_progress' });
		const child = await createFolder(project, { name: 'nested', parentFolder: parent });
		const grandchild = await createFolder(project, { name: 'deep', parentFolder: child });

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [parent.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.folders).toHaveLength(3);
		const parentEntry = manifest.folders!.find((f) => f.id === parent.id)!;
		const childEntry = manifest.folders!.find((f) => f.id === child.id)!;
		const grandchildEntry = manifest.folders!.find((f) => f.id === grandchild.id)!;

		// Each level nests directly under its parent dir — recursion reaches beyond
		// the first nesting level, with no repeated "folders/" segment.
		expect(childEntry.target).toMatch(new RegExp(`^${parentEntry.target}/[^/]+$`));
		expect(grandchildEntry.target).toMatch(new RegExp(`^${childEntry.target}/[^/]+$`));
		expect(folderShell(entries, parentEntry.target).parentFolderId).toBeNull();
		expect(folderShell(entries, childEntry.target).parentFolderId).toBe(parent.id);
		expect(folderShell(entries, grandchildEntry.target).parentFolderId).toBe(child.id);
	});

	it('disambiguates same-named sibling folders by creation order', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const older = await createFolder(project, {
			name: 'in_progress',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
		});
		const newer = await createFolder(project, {
			name: 'in_progress',
			createdAt: new Date('2026-02-01T00:00:00.000Z'),
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [older.id, newer.id],
		});
		const { manifest } = await readExport(stream);

		const olderTarget = manifest.folders!.find((f) => f.id === older.id)!.target;
		const newerTarget = manifest.folders!.find((f) => f.id === newer.id)!.target;
		// Oldest keeps the bare slug; the allocator suffixes the newer one.
		expect(olderTarget).toBe('folders/inprogress');
		expect(newerTarget).toBe('folders/inprogress-2');
	});

	it('re-roots an exported folder whose parent is left out of the export', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const parent = await createFolder(project, { name: 'in_progress' });
		const child = await createFolder(project, { name: 'nested', parentFolder: parent });

		// Request only the child; its real parent stays behind.
		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [child.id],
		});
		const { manifest, entries } = await readExport(stream);

		// Only the child ships, and it roots the package's forest.
		expect(manifest.folders).toHaveLength(1);
		const childEntry = manifest.folders![0];
		expect(childEntry).toMatchObject({ id: child.id, name: 'nested' });
		expect(childEntry.target).toMatch(/^folders\/[^/]+$/);
		// Its out-of-set parent ref is severed so every parent ref resolves in-package.
		expect(folderShell(entries, childEntry.target).parentFolderId).toBeNull();
	});

	it('aborts the whole export when any requested folder is inaccessible', async () => {
		const member = await createMember();
		const accessibleProject = await createTeamProject('Member project', member);
		const accessibleFolder = await createFolder(accessibleProject, { name: 'to_production' });

		const owner = await createOwner();
		const foreignProject = await createTeamProject('Owner project', owner);
		const inaccessibleFolder = await createFolder(foreignProject, { name: 'secret' });

		// The member can read accessibleFolder but not inaccessibleFolder; one bad id
		// poisons the batch, so the export aborts rather than shipping a partial set.
		await expect(
			service.exportPackage({
				user: member,
				workflowIds: [],
				folderIds: [accessibleFolder.id, inaccessibleFolder.id],
			}),
		).rejects.toThrow(/1 folder\(s\) not found or not accessible/);
	});
});

describe('folder package export — with contained workflows', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	// AC1
	it('writes a workflow contained in a requested folder under the folder’s workflows/ dir', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const workflow = await createWorkflow({ name: 'triage', parentFolder: folder }, project);

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		const folderEntry = manifest.folders!.find((f) => f.id === folder.id)!;
		expect(manifest.workflows).toHaveLength(1);
		const workflowEntry = manifest.workflows!.find((w) => w.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(new RegExp(`^${folderEntry.target}/workflows/[^/]+$`));

		expect(entries.find((e) => e.name === `${workflowEntry.target}/workflow.json`)).toBeDefined();
	});

	// AC1b
	it('nests a workflow inside a nested folder under <parent>/<child>/workflows/', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const parent = await createFolder(project, { name: 'in_progress' });
		const child = await createFolder(project, { name: 'nested', parentFolder: parent });
		const workflow = await createWorkflow({ name: 'playground', parentFolder: child }, project);

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [parent.id],
		});
		const { manifest, entries } = await readExport(stream);

		const childEntry = manifest.folders!.find((f) => f.id === child.id)!;
		const workflowEntry = manifest.workflows!.find((w) => w.id === workflow.id)!;
		expect(workflowEntry.target).toMatch(new RegExp(`^${childEntry.target}/workflows/[^/]+$`));
		expect(entries.find((e) => e.name === `${workflowEntry.target}/workflow.json`)).toBeDefined();
	});

	// AC2
	it('gathers a contained workflow’s credential at the package top level', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
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

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		// Credential bundles at top-level credentials/, not under the folder.
		expect(manifest.credentials).toHaveLength(1);
		expect(manifest.credentials![0].id).toBe(credential.id);
		expect(manifest.credentials![0].target).toMatch(/^credentials\//);
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
		expect(
			entries.find((e) => e.name === `${manifest.credentials![0].target}/credential.json`),
		).toBeDefined();
	});

	it("gathers a contained workflow's variable at the package top level", async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const variable = await createVariable('API_URL', 'https://api.example.com');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'triage',
			project,
			variableNames: ['API_URL'],
			parentFolder: folder,
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		// Global variable bundles at top-level variables/, not under the folder.
		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'API_URL',
				target: 'variables/apiurl',
			},
		]);
		expect(manifest.requirements).toEqual({
			variables: [
				{ name: 'API_URL', value: 'https://api.example.com', usedByWorkflows: [workflow.id] },
			],
		});
		expect(
			entries.find((e) => e.name === `${manifest.variables![0].target}/variable.json`),
		).toBeDefined();
	});

	// AC3
	it('aborts the whole export when a contained workflow is not exportable by the caller', async () => {
		const member = await createMember();
		const memberProject = await createTeamProject('Member project', member);
		const folder = await createFolder(memberProject, { name: 'in_progress' });

		const owner = await createOwner();
		const ownerProject = await createTeamProject('Owner project', owner);
		// The workflow is shared only with the owner's project but sits in the
		// member's folder, so the member can folder:read the folder yet cannot
		// workflow:export the workflow. The per-workflow export gate must abort.
		await createWorkflow({ name: 'secret', parentFolder: folder }, ownerProject);

		const exportPromise = service.exportPackage({
			user: member,
			workflowIds: [],
			folderIds: [folder.id],
		});
		await expect(exportPromise).rejects.toThrow(/workflow\(s\) not found or not accessible/);
		await expect(exportPromise).rejects.toBeInstanceOf(PackageEntityAccessDeniedError);
	});

	// Edge: a workflow in both folderIds and workflowIds is placed in the folder, once.
	it('places a workflow listed in both a folder and workflowIds inside the folder only', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		const workflow = await createWorkflow({ name: 'triage', parentFolder: folder }, project);

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [workflow.id],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		const folderEntry = manifest.folders!.find((f) => f.id === folder.id)!;
		expect(manifest.workflows).toHaveLength(1);
		expect(manifest.workflows![0].id).toBe(workflow.id);
		expect(manifest.workflows![0].target).toMatch(
			new RegExp(`^${folderEntry.target}/workflows/[^/]+$`),
		);

		// Exactly one workflow.json on disk — no double write, no top-level orphan.
		expect(entries.filter((e) => e.name.endsWith('/workflow.json'))).toHaveLength(1);
	});

	// Regression: an empty folder still emits only its shell.
	it('emits no workflows output for an empty folder', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'empty' });

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.workflows).toBeUndefined();
		expect(entries.some((e) => e.name.includes('/workflows/'))).toBe(false);
	});

	// A subfolder whose name slugifies to `workflows` must not collide with the
	// parent folder's `workflows/` container that holds its contained workflows.
	it('does not let a subfolder named "workflows" swallow the parent’s contained workflows', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const parent = await createFolder(project, { name: 'in_progress' });
		const workflow = await createWorkflow({ name: 'triage', parentFolder: parent }, project);
		const subfolder = await createFolder(project, { name: 'workflows', parentFolder: parent });

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [],
			folderIds: [parent.id],
		});
		const { manifest } = await readExport(stream);

		const subfolderTarget = manifest.folders!.find((f) => f.id === subfolder.id)!.target;
		const workflowTarget = manifest.workflows!.find((w) => w.id === workflow.id)!.target;

		// The subfolder is suffixed; the workflow stays under the parent's container.
		expect(subfolderTarget).toMatch(/\/workflows-2$/);
		expect(workflowTarget.startsWith(`${subfolderTarget}/`)).toBe(false);
	});

	// Telemetry: counts.workflows includes folder-contained workflows.
	it('counts folder-contained workflows in the export telemetry', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'in_progress' });
		await createWorkflow({ name: 'triage', parentFolder: folder }, project);
		await createWorkflow({ name: 'playground', parentFolder: folder }, project);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		try {
			await service.exportPackage({ user: owner, workflowIds: [], folderIds: [folder.id] });

			const exportedEvents = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-exported');
			expect(exportedEvents).toHaveLength(1);

			const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
			expect(payload.counts.workflows).toBe(2);
			expect(payload.counts.folders).toBe(1);
		} finally {
			emitSpy.mockRestore();
		}
	});
});
