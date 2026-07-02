import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';

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
