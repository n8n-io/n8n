import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

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
	type: 'http',
	usedByWorkflows,
});

const selection = (overrides: Partial<SelectivePushOptions> = {}): SelectivePushOptions => ({
	projectId: 'p1',
	workflowIds: [],
	deletedWorkflowIds: [],
	...overrides,
});

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
		existing: PackageManifest,
		branchFiles: Record<string, string>,
		staging: PackageManifest,
		stagingFiles: Record<string, string>,
		deletedWorkflowIds: string[] = [],
	) => {
		await writeTree(exportFolder, { 'manifest.json': manifestFile(existing), ...branchFiles });
		await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging), ...stagingFiles });
		return await updater.applySelection(
			exportFolder,
			stagingFolder,
			existing,
			new Set(deletedWorkflowIds),
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

	describe('assertDeletionsOnBranch', () => {
		it('rejects deletes of workflows that are not on the branch', () => {
			const manifest = makeManifest({ workflows: [wf('w1')], projects: [alpha] });

			expect(() =>
				updater.assertDeletionsOnBranch(manifest, selection({ deletedWorkflowIds: ['w-unknown'] })),
			).toThrow('Deleted workflows not found on the branch: w-unknown');
		});

		it('rejects deletes of workflows that belong to another project', () => {
			const other = { id: 'w-other', name: 'WOther', target: 'projects/beta/workflows/w-other' };
			const manifest = makeManifest({
				workflows: [wf('w1'), other],
				projects: [alpha, { id: 'p2', name: 'Beta', target: 'projects/beta' }],
			});

			expect(() =>
				updater.assertDeletionsOnBranch(manifest, selection({ deletedWorkflowIds: ['w-other'] })),
			).toThrow('Deleted workflows do not belong to the selected project: w-other');
		});

		it('accepts deletes of workflows under the selected project', () => {
			const manifest = makeManifest({ workflows: [wf('w1')], projects: [alpha] });

			expect(() =>
				updater.assertDeletionsOnBranch(manifest, selection({ deletedWorkflowIds: ['w1'] })),
			).not.toThrow();
		});
	});

	describe('applySelection', () => {
		it('moves unselected workflows along with their renamed folder and drops deleted ones', async () => {
			const revenue = folder('f1', 'Revenue', 'revenue');
			await apply(
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'Sales', 'sales')],
					workflows: [inFolder('w1', 'sales'), inFolder('w2', 'sales'), inFolder('w3', 'sales')],
				}),
				{
					'projects/alpha/project.json': '{}',
					'projects/alpha/folders/sales/folder.json': '{"name":"Sales"}',
					'projects/alpha/folders/sales/workflows/w1/workflow.json': '{"id":"w1","v":1}',
					'projects/alpha/folders/sales/workflows/w2/workflow.json': '{"id":"w2"}',
					'projects/alpha/folders/sales/workflows/w3/workflow.json': '{"id":"w3"}',
				},
				makeManifest({
					projects: [alpha],
					folders: [revenue],
					workflows: [inFolder('w1', 'revenue')],
				}),
				{
					'projects/alpha/project.json': '{}',
					'projects/alpha/folders/revenue/folder.json': '{"name":"Revenue"}',
					'projects/alpha/folders/revenue/workflows/w1/workflow.json': '{"id":"w1","v":2}',
				},
				['w3'],
			);

			await expectAbsent('projects/alpha/folders/sales');
			await expectAbsent('projects/alpha/folders/revenue/workflows/w3');
			expect(await readExported('projects/alpha/folders/revenue/folder.json')).toBe(
				'{"name":"Revenue"}',
			);
			expect(await readExported('projects/alpha/folders/revenue/workflows/w1/workflow.json')).toBe(
				'{"id":"w1","v":2}',
			);
			expect(await readExported('projects/alpha/folders/revenue/workflows/w2/workflow.json')).toBe(
				'{"id":"w2"}',
			);
			const manifest = await updater.readManifest(exportFolder);
			expect(manifest.folders).toEqual([revenue]);
			expect(manifest.workflows).toEqual([inFolder('w2', 'revenue'), inFolder('w1', 'revenue')]);
		});

		it('handles two folders swapping names without losing unselected workflows', async () => {
			// f1 is now named B (slug b) and f2 is named A (slug a); w1 and w3 are selected.
			await apply(
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'A', 'a'), folder('f2', 'B', 'b')],
					workflows: [
						inFolder('w1', 'a'),
						inFolder('w2', 'a'),
						inFolder('w3', 'b'),
						inFolder('w4', 'b'),
					],
				}),
				{
					'projects/alpha/folders/a/folder.json': '{"name":"A"}',
					'projects/alpha/folders/b/folder.json': '{"name":"B"}',
					'projects/alpha/folders/a/workflows/w1/workflow.json': '{"id":"w1"}',
					'projects/alpha/folders/a/workflows/w2/workflow.json': '{"id":"w2"}',
					'projects/alpha/folders/b/workflows/w3/workflow.json': '{"id":"w3"}',
					'projects/alpha/folders/b/workflows/w4/workflow.json': '{"id":"w4"}',
				},
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'B', 'b'), folder('f2', 'A', 'a')],
					workflows: [inFolder('w1', 'b'), inFolder('w3', 'a')],
				}),
				{
					'projects/alpha/folders/b/folder.json': '{"name":"B","id":"f1"}',
					'projects/alpha/folders/a/folder.json': '{"name":"A","id":"f2"}',
					'projects/alpha/folders/b/workflows/w1/workflow.json': '{"id":"w1","moved":true}',
					'projects/alpha/folders/a/workflows/w3/workflow.json': '{"id":"w3","moved":true}',
				},
			);

			const tree: Record<string, string> = {
				'projects/alpha/folders/b/folder.json': '{"name":"B","id":"f1"}',
				'projects/alpha/folders/a/folder.json': '{"name":"A","id":"f2"}',
				'projects/alpha/folders/b/workflows/w1/workflow.json': '{"id":"w1","moved":true}',
				'projects/alpha/folders/b/workflows/w2/workflow.json': '{"id":"w2"}',
				'projects/alpha/folders/a/workflows/w3/workflow.json': '{"id":"w3","moved":true}',
				'projects/alpha/folders/a/workflows/w4/workflow.json': '{"id":"w4"}',
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

		it('rejects a relocation when the branch is missing the listed directory', async () => {
			const sales = folder('f1', 'Sales', 'sales');
			await expect(
				apply(
					makeManifest({
						projects: [alpha],
						folders: [sales],
						workflows: [inFolder('w1', 'sales'), inFolder('w2', 'sales')],
					}),
					{
						'projects/alpha/folders/sales/folder.json': '{}',
						'projects/alpha/folders/sales/workflows/w1/workflow.json': '{}',
					},
					makeManifest({
						projects: [alpha],
						folders: [folder('f1', 'Revenue', 'revenue')],
						workflows: [inFolder('w1', 'revenue')],
					}),
					{
						'projects/alpha/folders/revenue/folder.json': '{}',
						'projects/alpha/folders/revenue/workflows/w1/workflow.json': '{}',
					},
				),
			).rejects.toThrow(
				/lists "projects\/alpha\/folders\/sales\/workflows\/w2" but the directory is missing/,
			);
		});

		it('removes a dependency directory once its last user dropped it', async () => {
			const merged = await apply(
				makeManifest({
					workflows: [wf('w1'), wf('w2')],
					projects: [alpha],
					credentials: [cred('c1'), cred('c-old')],
					requirements: { credentials: [credReq('c1', ['w1']), credReq('c-old', ['w1'])] },
				}),
				{
					'projects/alpha/workflows/w1/workflow.json': '{"id":"w1"}',
					'projects/alpha/workflows/w2/workflow.json': '{"id":"w2"}',
					'projects/alpha/credentials/c1/credential.json': '{}',
					'projects/alpha/credentials/c-old/credential.json': '{}',
				},
				makeManifest({
					workflows: [wf('w1')],
					projects: [alpha],
					credentials: [cred('c1')],
					requirements: { credentials: [credReq('c1', ['w1'])] },
				}),
				{
					'projects/alpha/workflows/w1/workflow.json': '{"id":"w1"}',
					'projects/alpha/credentials/c1/credential.json': '{}',
				},
			);

			await expectAbsent('projects/alpha/credentials/c-old');
			expect(await readExported('projects/alpha/credentials/c1/credential.json')).toBe('{}');
			expect(merged.credentials).toEqual([cred('c1')]);
		});
	});

	describe('deltaCounts', () => {
		it('reports entities added to or removed from the branch, not the export size', () => {
			const before = makeManifest({
				workflows: [wf('w1'), wf('w2')],
				credentials: [cred('c1'), cred('c-old')],
				tags: [{ id: 't1', name: 'Tag1', target: 'tags/t1' }],
			});
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

		it('rejects a directory that is a symbolic link and writes nothing through it', async () => {
			const existing = makeManifest({ projects: [alpha], workflows: [wf('w1')] });
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(existing),
				'projects/alpha/project.json': '{}',
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha], workflows: [wf('w1')] })),
				'projects/alpha/workflows/w1/workflow.json': '{"id":"w1"}',
			});

			await expect(
				updater.applySelection(exportFolder, stagingFolder, existing, new Set()),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(outside)).toEqual([]);
		});

		it('rejects an export root that is a symbolic link before reading the manifest', async () => {
			await writeTree(outside, { 'manifest.json': manifestFile(makeManifest()) });
			await mkdir(path.dirname(exportFolder), { recursive: true });
			await symlink(outside, exportFolder);

			await expect(updater.readManifest(exportFolder)).rejects.toThrow(
				/"\." on the branch is a symbolic link/,
			);
		});

		it('rejects a stale target whose parent is a symbolic link instead of deleting through it', async () => {
			await writeTree(outside, { 'w1/workflow.json': '{"id":"w1"}' });
			const existing = makeManifest({ projects: [alpha], workflows: [wf('w1')] });
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(existing),
				'projects/alpha/project.json': '{}',
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha] })),
			});

			await expect(
				updater.applySelection(exportFolder, stagingFolder, existing, new Set(['w1'])),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(path.join(outside, 'w1'))).toEqual(['workflow.json']);
		});
	});
});
