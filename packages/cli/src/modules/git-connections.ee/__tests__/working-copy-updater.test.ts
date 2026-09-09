import type { InstanceSettings } from 'n8n-core';
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	return {
		...actual,
		rename: vi.fn(async (from: string, to: string) => await actual.rename(from, to)),
	};
});

import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import type { BranchState } from '../branch-placement';
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
	const updater = new WorkingCopyUpdater(
		mock<InstanceSettings>({ instanceId: 'inst-1' }),
		mockLogger(),
	);

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
	const readWrittenManifest = async () =>
		packageManifestSchema.parse(JSON.parse(await readExported('manifest.json')));

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
		it('takes projects, folders and workflows from their json files', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/project.json': projectFile,
				'projects/alpha/folders/sales/folder.json': folderFile('f1', 'Sales'),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch.projects).toEqual([alpha]);
			expect(branch.folders).toEqual([folder('f1', 'Sales', 'sales')]);
			expect(branch.workflows).toEqual([wf('w1')]);
			expect(branch).not.toHaveProperty('credentials');
		});

		it('returns an empty state when the export has no entity files', async () => {
			await mkdir(exportFolder, { recursive: true });

			expect(await updater.readBranchState(exportFolder)).toEqual({});
		});

		it('rejects malformed JSON in an entity file as a bad request', async () => {
			await writeTree(exportFolder, { 'projects/alpha/project.json': '{not-json' });

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow('not valid JSON');
		});

		it('rejects an entity file that is missing an id or a name', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/project.json': JSON.stringify({ id: 'p1' }),
			});

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				'missing an id or a name',
			);
		});

		it('rejects two workflows that share an id', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/beta/workflows/w1/workflow.json': workflowFile('w1'),
			});

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				/two workflows with id "w1"/,
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

	describe('assertNoCrossProjectMoves', () => {
		const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
		const inBeta = { id: 'w-moved', name: 'WMoved', target: 'projects/beta/workflows/w-moved' };

		it('rejects a selected workflow that the branch holds under another project', () => {
			const branch: BranchState = { workflows: [wf('w1'), inBeta], projects: [alpha, beta] };

			expect(() =>
				updater.assertNoCrossProjectMoves(branch, selection({ workflowIds: ['w-moved'] })),
			).toThrow('These workflows moved to another project: w-moved');
		});

		it('rejects it even when the branch does not hold the selected project yet', () => {
			const branch: BranchState = { workflows: [inBeta], projects: [beta] };

			expect(() =>
				updater.assertNoCrossProjectMoves(branch, selection({ workflowIds: ['w-moved'] })),
			).toThrow('These workflows moved to another project: w-moved');
		});

		it('accepts a selected workflow that the branch holds under the selected project', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertNoCrossProjectMoves(branch, selection({ workflowIds: ['w1'] })),
			).not.toThrow();
		});

		it('accepts a selected workflow that the branch does not hold yet', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertNoCrossProjectMoves(branch, selection({ workflowIds: ['w-new'] })),
			).not.toThrow();
		});

		it('accepts a selection that moves nothing, so a delete-only push is unaffected', () => {
			const branch: BranchState = { workflows: [wf('w1'), inBeta], projects: [alpha, beta] };

			expect(() =>
				updater.assertNoCrossProjectMoves(branch, selection({ deletedWorkflowIds: ['w1'] })),
			).not.toThrow();
		});
	});

	describe('applySelection', () => {
		it('rejects a cross-project delete before it writes', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			const other = { id: 'w-other', name: 'WOther', target: 'projects/beta/workflows/w-other' };
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(
					makeManifest({
						projects: [alpha, beta],
						workflows: [wf('w1'), other],
					}),
				),
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/beta/project.json': JSON.stringify({ id: beta.id, name: beta.name }),
				'projects/beta/workflows/w-other/workflow.json': workflowFile('w-other'),
			});
			const staging = makeManifest({ projects: [alpha] });
			await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging) });

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha, beta], workflows: [wf('w1'), other] },
					selection({ deletedWorkflowIds: ['w-other'] }),
				),
			).rejects.toThrow('Deleted workflows do not belong to the selected project: w-other');

			expect(await readExported('projects/beta/workflows/w-other/workflow.json')).toBe(
				workflowFile('w-other'),
			);
		});

		it('rejects a delete when two workflows share an id', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			const inBeta = { id: 'w1', name: 'W1', target: 'projects/beta/workflows/w1' };
			await writeTree(exportFolder, {
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
				'projects/beta/project.json': JSON.stringify({ id: beta.id, name: beta.name }),
				'projects/beta/workflows/w1/workflow.json': workflowFile('w1'),
			});
			const staging = makeManifest({ projects: [alpha] });
			await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging) });

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha, beta], workflows: [wf('w1'), inBeta] },
					selection({ deletedWorkflowIds: ['w1'] }),
				),
			).rejects.toThrow(/two workflows with id "w1"/);

			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
			expect(await readExported('projects/beta/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
		});

		it('rejects a cross-project move before it writes', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };
			const inBeta = { id: 'w-moved', name: 'WMoved', target: 'projects/beta/workflows/w-moved' };
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(
					makeManifest({ projects: [alpha, beta], workflows: [inBeta] }),
				),
				'projects/alpha/project.json': projectFile,
				'projects/beta/project.json': JSON.stringify({ id: beta.id, name: beta.name }),
				'projects/beta/workflows/w-moved/workflow.json': workflowFile('w-moved'),
			});
			const staging = makeManifest({
				projects: [alpha],
				workflows: [wf('w-moved')],
			});
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w-moved/workflow.json': workflowFile('w-moved', { v: 2 }),
			});

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha, beta], workflows: [inBeta] },
					selection({ workflowIds: ['w-moved'] }),
				),
			).rejects.toThrow('These workflows moved to another project: w-moved');

			expect(await readExported('projects/beta/workflows/w-moved/workflow.json')).toBe(
				workflowFile('w-moved'),
			);
		});

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
			expect((await readWrittenManifest()).workflows?.map((entry) => entry.id).sort()).toEqual([
				'w1',
				'w2',
			]);
			const branch = await updater.readBranchState(exportFolder);
			expect(branch.folders).toEqual([folder('f1', 'Sales', 'sales')]);
			expect(branch.workflows).toEqual(
				expect.arrayContaining([inFolder('w2', 'sales'), inFolder('w1', 'sales')]),
			);
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
						'projects/alpha/project.json': projectFile,
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
			expect((await readWrittenManifest()).workflows?.map((entry) => entry.id).sort()).toEqual([
				'w1',
				'w2',
				'w3',
				'w4',
			]);
		});

		it('leaves an unused credential stub the selection dropped', async () => {
			await apply(
				{
					manifest: makeManifest({
						projects: [alpha],
						workflows: [wf('w1'), wf('w2')],
						credentials: [cred('c1'), cred('c-old')],
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
					manifest: makeManifest({
						projects: [alpha],
						workflows: [wf('w1')],
						credentials: [cred('c1')],
					}),
					files: {
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
						'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
					},
				},
				{ workflowIds: ['w1'] },
			);

			expect(await readExported('projects/alpha/credentials/c-old/credential.json')).toBe(
				credentialFile('c-old'),
			);
			expect(await readExported('projects/alpha/credentials/c1/credential.json')).toBe(
				credentialFile('c1'),
			);
		});

		it('keeps an unused dependency that belongs to another project', async () => {
			const beta = { id: 'p2', name: 'Beta', target: 'projects/beta' };

			await apply(
				{
					manifest: makeManifest({
						projects: [alpha, beta],
						workflows: [wf('w1')],
						credentials: [
							cred('c-old'),
							{ id: 'c-beta', name: 'c-beta', target: 'projects/beta/credentials/c-beta' },
						],
					}),
					files: {
						'projects/alpha/project.json': projectFile,
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
						'projects/alpha/credentials/c-old/credential.json': credentialFile('c-old'),
						'projects/beta/credentials/c-beta/credential.json': credentialFile('c-beta'),
					},
				},
				{
					manifest: makeManifest({ projects: [alpha], workflows: [wf('w1')] }),
					files: {
						'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
					},
				},
				{ workflowIds: ['w1'] },
			);

			expect(await readExported('projects/alpha/credentials/c-old/credential.json')).toBe(
				credentialFile('c-old'),
			);
			expect(await readExported('projects/beta/credentials/c-beta/credential.json')).toBe(
				credentialFile('c-beta'),
			);
		});

		it('leaves the export untouched when a write is rejected', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha], workflows: [wf('w1')] })),
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			await symlink(
				path.join(root, 'outside'),
				path.join(exportFolder, 'projects/alpha/workflows/w-new'),
			);
			const staging = makeManifest({ projects: [alpha], workflows: [wf('w-new')] });
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w-new/workflow.json': workflowFile('w-new'),
			});

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha], workflows: [wf('w1')] },
					selection({ workflowIds: ['w-new'] }),
				),
			).rejects.toThrow(/symbolic link/);

			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
		});

		it('refuses a stale target occupied by an unselected leaf', async () => {
			const shared = 'projects/alpha/workflows/shared';
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(
					makeManifest({
						projects: [alpha],
						workflows: [
							{ id: 'w1', name: 'W1', target: shared },
							{ id: 'w2', name: 'W2', target: shared },
						],
					}),
				),
				'projects/alpha/project.json': projectFile,
				[`${shared}/workflow.json`]: workflowFile('w2'),
			});
			const staging = makeManifest({ projects: [alpha] });
			await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging) });

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{
						projects: [alpha],
						workflows: [
							{ id: 'w1', name: 'W1', target: shared },
							{ id: 'w2', name: 'W2', target: shared },
						],
					},
					selection({ deletedWorkflowIds: ['w1'] }),
				),
			).rejects.toThrow('would delete content the selection keeps');

			expect(await readExported(`${shared}/workflow.json`)).toBe(workflowFile('w2'));
		});

		it('leaves the export in place when moving it aside fails', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha], workflows: [wf('w1')] })),
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			const staging = makeManifest({
				projects: [alpha],
				workflows: [wf('w1')],
			});
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
			});
			vi.mocked(rename).mockRejectedValueOnce(new Error('EACCES'));

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha], workflows: [wf('w1')] },
					selection({ workflowIds: ['w1'] }),
				),
			).rejects.toThrow('EACCES');

			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
		});

		it('restores the original export when swapping the work folder in fails', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest({ projects: [alpha], workflows: [wf('w1')] })),
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});
			const staging = makeManifest({
				projects: [alpha],
				workflows: [wf('w1')],
			});
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
			});
			const { rename: actualRename } =
				await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
			vi.mocked(rename)
				.mockImplementationOnce(async (from, to) => await actualRename(from, to))
				.mockRejectedValueOnce(new Error('EACCES'));

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha], workflows: [wf('w1')] },
					selection({ workflowIds: ['w1'] }),
				),
			).rejects.toThrow('EACCES');

			expect(await readExported('projects/alpha/workflows/w1/workflow.json')).toBe(
				workflowFile('w1'),
			);
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
