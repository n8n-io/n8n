import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import type { BranchState } from '../manifest-merge';
import { WorkingCopyUpdater } from '../working-copy-updater';
import type { SelectivePushOptions } from '../working-copy-updater';

const baseMetadata = {
	packageFormatVersion: '1' as const,
	exportedAt: '2026-01-01T00:00:00.000Z',
	sourceN8nVersion: '1.0.0',
	sourceId: 'inst-1',
};

const makeManifest = (overrides: Partial<PackageManifest> = {}): PackageManifest => ({
	...baseMetadata,
	...overrides,
});

const CREDENTIAL_TYPE = 'httpBasicAuth';
const NODE_TYPE = 'n8n-nodes-base.httpRequest';

const alpha = { id: 'p1', name: 'Alpha', target: 'projects/alpha' };
const wf = (id: string) => ({
	id,
	name: id.toUpperCase(),
	target: `projects/alpha/workflows/${id}`,
});
const folder = (id: string, name: string, slug: string) => ({
	id,
	name,
	target: `projects/alpha/folders/${slug}`,
});
const inFolder = (id: string, slug: string) => ({
	id,
	name: id.toUpperCase(),
	target: `projects/alpha/folders/${slug}/workflows/${id}`,
});
const cred = (id: string) => ({ id, name: id, target: `projects/alpha/credentials/${id}` });
const credReq = (id: string, usedByWorkflows: string[]) => ({
	id,
	name: id,
	type: CREDENTIAL_TYPE,
	usedByWorkflows,
});

// The files an export writes. The manifest states what the branch holds; these
// are the directories the push moves and removes.
const projectFile = JSON.stringify({ id: alpha.id, name: alpha.name });
const folderFile = (id: string, name: string) => JSON.stringify({ id, name });
const workflowFile = (id: string, extra: Record<string, unknown> = {}) =>
	JSON.stringify({
		id,
		name: id.toUpperCase(),
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...extra,
	});
const credentialFile = (id: string) => JSON.stringify({ id, name: id });

const selection = (overrides: Partial<SelectivePushOptions> = {}): SelectivePushOptions => ({
	projectId: 'p1',
	workflowIds: [],
	deletedWorkflowIds: [],
	...overrides,
});

interface Side {
	manifest: PackageManifest;
	files: Record<string, string>;
}

describe('WorkingCopyUpdater', () => {
	let root: string;
	let exportFolder: string;
	let stagingFolder: string;
	const updater = new WorkingCopyUpdater(mock<InstanceSettings>({ instanceId: 'inst-1' }));

	const writeTree = async (base: string, files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(base, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};
	const manifestFile = (manifest: PackageManifest) => JSON.stringify(manifest);
	const readExported = async (relative: string) =>
		await readFile(path.join(exportFolder, relative), 'utf-8');
	const expectAbsent = async (relative: string) =>
		await expect(stat(path.join(exportFolder, relative))).rejects.toThrow();

	/** Write the branch and the staging export, then apply the selection. */
	const apply = async (
		branch: Side,
		staging: Side,
		overrides: Partial<SelectivePushOptions> = {},
	) => {
		await writeTree(exportFolder, {
			'manifest.json': manifestFile(branch.manifest),
			...branch.files,
		});
		await writeTree(stagingFolder, {
			'manifest.json': manifestFile(staging.manifest),
			...staging.files,
		});
		const state = await updater.readBranchState(exportFolder);
		return await updater.applySelection(
			exportFolder,
			stagingFolder,
			staging.manifest,
			state,
			selection(overrides),
		);
	};

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-working-copy-'));
		exportFolder = path.join(root, 'repository', 'n8n-export');
		stagingFolder = path.join(root, 'staging');
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	describe('validateSelection', () => {
		it('rejects an empty selection', () => {
			expect(() => updater.validateSelection(selection())).toThrow(
				'At least one workflow must be selected or deleted',
			);
		});

		it('rejects duplicate workflowIds', () => {
			expect(() => updater.validateSelection(selection({ workflowIds: ['w1', 'w1'] }))).toThrow(
				'workflowIds contains duplicates',
			);
		});

		it('rejects duplicate deletedWorkflowIds', () => {
			expect(() =>
				updater.validateSelection(selection({ deletedWorkflowIds: ['w1', 'w1'] })),
			).toThrow('deletedWorkflowIds contains duplicates');
		});

		it('rejects a workflow that is both selected and deleted', () => {
			expect(() =>
				updater.validateSelection(selection({ workflowIds: ['w1'], deletedWorkflowIds: ['w1'] })),
			).toThrow('A workflow cannot be both selected and deleted in the same push');
		});
	});

	describe('readBranchState', () => {
		it('takes the entries and the requirements from the branch manifest', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(
					makeManifest({
						projects: [alpha],
						workflows: [wf('w1')],
						credentials: [cred('c1')],
						requirements: { credentials: [credReq('c1', ['w1'])] },
					}),
				),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch.projects).toEqual([alpha]);
			expect(branch.workflows).toEqual([wf('w1')]);
			expect(branch.credentials).toEqual([cred('c1')]);
			expect(branch.requirements?.credentials).toEqual([credReq('c1', ['w1'])]);
		});

		it('drops the export metadata, which always comes from the new export', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ workflows: [wf('w1')] })),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch).not.toHaveProperty('exportedAt');
			expect(branch).not.toHaveProperty('sourceId');
		});

		it('rejects an export that has no manifest', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				'The export has no manifest.json',
			);
		});
	});

	describe('assertDeletionsOnBranch', () => {
		it('rejects deletes of workflows that are not on the branch', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w-unknown'] })),
			).toThrow('Deleted workflows not found on the branch: w-unknown');
		});

		it('rejects deletes of workflows that belong to another project', () => {
			const other = { id: 'w-other', name: 'WOther', target: 'projects/beta/workflows/w-other' };
			const branch: BranchState = {
				workflows: [wf('w1'), other],
				projects: [alpha, { id: 'p2', name: 'Beta', target: 'projects/beta' }],
			};

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w-other'] })),
			).toThrow('Deleted workflows do not belong to the selected project: w-other');
		});

		it('accepts deletes of workflows under the selected project', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w1'] })),
			).not.toThrow();
		});
	});

	describe('applySelection', () => {
		it('keeps a renamed folder where the branch has it, so unselected workflows stay put', async () => {
			await apply(
				{
					manifest: makeManifest({
						projects: [alpha],
						folders: [folder('f1', 'Sales', 'sales')],
						workflows: [inFolder('w1', 'sales'), inFolder('w2', 'sales'), inFolder('w3', 'sales')],
					}),
					files: {
						'projects/alpha/project.json': projectFile,
						'projects/alpha/folders/sales/folder.json': folderFile('f1', 'Sales'),
						'projects/alpha/folders/sales/workflows/w1/workflow.json': workflowFile('w1', { v: 1 }),
						'projects/alpha/folders/sales/workflows/w2/workflow.json': workflowFile('w2'),
						'projects/alpha/folders/sales/workflows/w3/workflow.json': workflowFile('w3'),
					},
				},
				{
					manifest: makeManifest({
						projects: [alpha],
						folders: [folder('f1', 'Revenue', 'revenue')],
						workflows: [inFolder('w1', 'revenue')],
					}),
					files: {
						'projects/alpha/project.json': projectFile,
						'projects/alpha/folders/revenue/folder.json': folderFile('f1', 'Revenue'),
						'projects/alpha/folders/revenue/workflows/w1/workflow.json': workflowFile('w1', {
							v: 2,
						}),
					},
				},
				{ workflowIds: ['w1'], deletedWorkflowIds: ['w3'] },
			);

			await expectAbsent('projects/alpha/folders/revenue');
			await expectAbsent('projects/alpha/folders/sales/workflows/w3');
			// The folder was renamed on the instance, but nobody selected that change.
			expect(await readExported('projects/alpha/folders/sales/folder.json')).toBe(
				folderFile('f1', 'Sales'),
			);
			expect(await readExported('projects/alpha/folders/sales/workflows/w1/workflow.json')).toBe(
				workflowFile('w1', { v: 2 }),
			);
			expect(await readExported('projects/alpha/folders/sales/workflows/w2/workflow.json')).toBe(
				workflowFile('w2'),
			);
			const manifest = await updater.readManifest(exportFolder);
			expect(manifest.folders).toEqual([folder('f1', 'Sales', 'sales')]);
			// The unselected workflow keeps its place in the list; the selected one
			// is re-appended under the directory the branch keeps.
			expect(manifest.workflows).toEqual([inFolder('w2', 'sales'), inFolder('w1', 'sales')]);
		});

		it('keeps both folders where the branch has them when their names swap', async () => {
			// f1 is now named B (slug b) and f2 is named A (slug a); w1 and w3 are selected.
			await apply(
				{
					manifest: makeManifest({
						projects: [alpha],
						folders: [folder('f1', 'A', 'a'), folder('f2', 'B', 'b')],
						workflows: [
							inFolder('w1', 'a'),
							inFolder('w2', 'a'),
							inFolder('w3', 'b'),
							inFolder('w4', 'b'),
						],
					}),
					files: {
						'projects/alpha/folders/a/folder.json': folderFile('f1', 'A'),
						'projects/alpha/folders/b/folder.json': folderFile('f2', 'B'),
						'projects/alpha/folders/a/workflows/w1/workflow.json': workflowFile('w1'),
						'projects/alpha/folders/a/workflows/w2/workflow.json': workflowFile('w2'),
						'projects/alpha/folders/b/workflows/w3/workflow.json': workflowFile('w3'),
						'projects/alpha/folders/b/workflows/w4/workflow.json': workflowFile('w4'),
					},
				},
				{
					manifest: makeManifest({
						projects: [alpha],
						folders: [folder('f1', 'B', 'b'), folder('f2', 'A', 'a')],
						workflows: [inFolder('w1', 'b'), inFolder('w3', 'a')],
					}),
					files: {
						'projects/alpha/folders/b/folder.json': folderFile('f1', 'B'),
						'projects/alpha/folders/a/folder.json': folderFile('f2', 'A'),
						'projects/alpha/folders/b/workflows/w1/workflow.json': workflowFile('w1', {
							moved: true,
						}),
						'projects/alpha/folders/a/workflows/w3/workflow.json': workflowFile('w3', {
							moved: true,
						}),
					},
				},
				{ workflowIds: ['w1', 'w3'] },
			);

			// Each selected workflow lands in the directory its folder has on the
			// branch, next to the siblings nobody selected.
			const tree: Record<string, string> = {
				'projects/alpha/folders/a/folder.json': folderFile('f1', 'A'),
				'projects/alpha/folders/b/folder.json': folderFile('f2', 'B'),
				'projects/alpha/folders/a/workflows/w1/workflow.json': workflowFile('w1', { moved: true }),
				'projects/alpha/folders/a/workflows/w2/workflow.json': workflowFile('w2'),
				'projects/alpha/folders/b/workflows/w3/workflow.json': workflowFile('w3', { moved: true }),
				'projects/alpha/folders/b/workflows/w4/workflow.json': workflowFile('w4'),
			};
			for (const [file, content] of Object.entries(tree)) {
				expect(await readExported(file), file).toBe(content);
			}
			const manifest = await updater.readManifest(exportFolder);
			expect(manifest.workflows!.map((w) => w.target).sort()).toEqual(
				Object.keys(tree)
					.filter((f) => f.endsWith('workflow.json'))
					.map((f) => path.dirname(f))
					.sort(),
			);
		});

		it('removes a dependency directory once its last user dropped it', async () => {
			const merged = await apply(
				{
					manifest: makeManifest({
						projects: [alpha],
						workflows: [wf('w1'), wf('w2')],
						credentials: [cred('c1'), cred('c-old')],
						requirements: {
							credentials: [credReq('c1', ['w1']), credReq('c-old', ['w1'])],
							nodeTypes: [{ type: NODE_TYPE, typeVersion: 1, usedByWorkflows: ['w1'] }],
						},
					}),
					files: {
						'projects/alpha/project.json': projectFile,
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
						'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
						'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
						'projects/alpha/credentials/c-old/credential.json': credentialFile('c-old'),
					},
				},
				{
					// w1 is re-exported and now uses c1 only.
					manifest: makeManifest({
						projects: [alpha],
						workflows: [wf('w1')],
						credentials: [cred('c1')],
						requirements: {
							credentials: [credReq('c1', ['w1'])],
							nodeTypes: [{ type: NODE_TYPE, typeVersion: 1, usedByWorkflows: ['w1'] }],
						},
					}),
					files: {
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
						'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
					},
				},
				{ workflowIds: ['w1'] },
			);

			await expectAbsent('projects/alpha/credentials/c-old');
			expect(await readExported('projects/alpha/credentials/c1/credential.json')).toBe(
				credentialFile('c1'),
			);
			expect(merged.credentials).toEqual([cred('c1')]);
			expect(merged.requirements?.credentials).toEqual([credReq('c1', ['w1'])]);
		});

		it('keeps an unused dependency that belongs to another project', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			const betaCred = { id: 'c-beta', name: 'c-beta', target: 'projects/beta/credentials/c-beta' };

			const merged = await apply(
				{
					manifest: makeManifest({
						projects: [alpha, beta],
						workflows: [wf('w1')],
						credentials: [cred('c-old'), betaCred],
						requirements: { credentials: [credReq('c-old', ['w1'])] },
					}),
					files: {
						'projects/alpha/project.json': projectFile,
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
						'projects/alpha/credentials/c-old/credential.json': credentialFile('c-old'),
						'projects/beta/credentials/c-beta/credential.json': credentialFile('c-beta'),
					},
				},
				{
					// w1 drops its credential. Beta is not part of this push.
					manifest: makeManifest({ projects: [alpha], workflows: [wf('w1')] }),
					files: {
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
					},
				},
				{ workflowIds: ['w1'] },
			);

			await expectAbsent('projects/alpha/credentials/c-old');
			expect(await readExported('projects/beta/credentials/c-beta/credential.json')).toBe(
				credentialFile('c-beta'),
			);
			expect(merged.credentials).toEqual([betaCred]);
		});
	});

	describe('deltaCounts', () => {
		it('reports entities added to or removed from the branch, not the export size', () => {
			const before: BranchState = {
				workflows: [wf('w1'), wf('w2')],
				credentials: [cred('c1'), cred('c-old')],
				tags: [{ id: 't1', name: 'Tag1', target: 'tags/t1' }],
			};
			// c-new added, c-old removed, c1 and t1 unchanged.
			const after = makeManifest({
				workflows: [wf('w1'), wf('w2')],
				credentials: [cred('c1'), cred('c-new')],
				tags: [{ id: 't1', name: 'Tag1', target: 'tags/t1' }],
			});

			expect(
				updater.deltaCounts(
					before,
					after,
					selection({ workflowIds: ['w1'], deletedWorkflowIds: ['w2'] }),
				),
			).toEqual({
				workflows: 2,
				folders: 0,
				credentials: 2,
				dataTables: 0,
				variables: 0,
				tags: 0,
			});
		});
	});

	describe('symbolic links on the branch', () => {
		let outside: string;

		beforeEach(async () => {
			outside = path.join(root, 'outside');
			await mkdir(outside, { recursive: true });
		});

		it('writes nothing through a symbolic link', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha] })),
				'projects/alpha/project.json': projectFile,
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			const staging = makeManifest({ projects: [alpha], workflows: [wf('w1')] });
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha] },
					selection({ workflowIds: ['w1'] }),
				),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(outside)).toEqual([]);
		});

		it('refuses an export root that is a symbolic link', async () => {
			await writeTree(outside, { 'manifest.json': manifestFile(makeManifest()) });
			await mkdir(path.dirname(exportFolder), { recursive: true });
			await symlink(outside, exportFolder);

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				/"\." on the branch is a symbolic link/,
			);
		});

		it('rejects a stale target whose parent is a symbolic link instead of deleting through it', async () => {
			await writeTree(outside, { 'w1/workflow.json': workflowFile('w1') });
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha] })),
				'projects/alpha/project.json': projectFile,
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			const staging = makeManifest({ projects: [alpha] });
			await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging) });
			const branch: BranchState = { projects: [alpha], workflows: [wf('w1')] };

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					branch,
					selection({ deletedWorkflowIds: ['w1'] }),
				),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(path.join(outside, 'w1'))).toEqual(['workflow.json']);
		});
	});
});
